//go:build windows

package main

import (
	"os"
	"runtime"
	"syscall"
	"time"
	"unsafe"
)

// COM GUID
type comGUID struct {
	Data1 uint32
	Data2 uint16
	Data3 uint16
	Data4 [8]byte
}

// ITaskbarList3 COM interface
type iTaskbarList3Vtbl struct {
	QueryInterface       uintptr
	AddRef               uintptr
	Release              uintptr
	HrInit               uintptr
	AddTab               uintptr
	DeleteTab            uintptr
	ActivateTab          uintptr
	SetActiveAlt         uintptr
	MarkFullscreenWindow uintptr
	SetProgressValue     uintptr
	SetProgressState     uintptr
}

type iTaskbarList3 struct {
	vtbl *iTaskbarList3Vtbl
}

var (
	ole32DLL    = syscall.NewLazyDLL("ole32.dll")
	user32DLL   = syscall.NewLazyDLL("user32.dll")
	kernel32DLL = syscall.NewLazyDLL("kernel32.dll")

	procCoInitializeEx           = ole32DLL.NewProc("CoInitializeEx")
	procCoCreateInstance         = ole32DLL.NewProc("CoCreateInstance")
	procFindWindowW              = user32DLL.NewProc("FindWindowW")
	procEnumWindows              = user32DLL.NewProc("EnumWindows")
	procGetWindowThreadProcessId = user32DLL.NewProc("GetWindowThreadProcessId")
	procIsWindowVisible          = user32DLL.NewProc("IsWindowVisible")
	procSendMessageW             = user32DLL.NewProc("SendMessageW")
	procLoadIconW                = user32DLL.NewProc("LoadIconW")
	procGetModuleHandleW         = kernel32DLL.NewProc("GetModuleHandleW")
)

var (
	clsidTaskbarList = comGUID{0x56FDF344, 0xFD6D, 0x11d0, [8]byte{0x95, 0x8A, 0x00, 0x60, 0x97, 0xC9, 0xA0, 0x90}}
	iidITaskbarList3 = comGUID{0xea1afb91, 0x9e28, 0x4b86, [8]byte{0x90, 0xe9, 0x9e, 0x9f, 0x8a, 0x5e, 0xef, 0xaf}}
)

const (
	tbpfNoProgress = 0x0
	tbpfNormal     = 0x2
	wmSetIcon      = 0x0080
	iconSmall      = 0
	iconBig        = 1
)

var taskbarCh chan float64

func initTaskbar() {
	taskbarCh = make(chan float64, 16)
	go taskbarWorker()
}

func taskbarWorker() {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	// Wait for the Wails window to appear
	var hwnd uintptr
	pid := uint32(os.Getpid())
	for i := 0; i < 20; i++ {
		time.Sleep(500 * time.Millisecond)
		hwnd = findWindowByPID(pid)
		if hwnd != 0 {
			break
		}
	}
	if hwnd == 0 {
		return
	}

	// Set window icon from exe resources
	hModule, _, _ := procGetModuleHandleW.Call(0)
	if hModule != 0 {
		// go-winres uses resource name "APP" for the icon group
		appName, _ := syscall.UTF16PtrFromString("APP")
		hIcon, _, _ := procLoadIconW.Call(hModule, uintptr(unsafe.Pointer(appName)))
		if hIcon != 0 {
			procSendMessageW.Call(hwnd, wmSetIcon, iconBig, hIcon)
			procSendMessageW.Call(hwnd, wmSetIcon, iconSmall, hIcon)
		}
	}

	// Initialize COM on this thread
	procCoInitializeEx.Call(0, 0x2) // COINIT_APARTMENTTHREADED

	// Create ITaskbarList3
	var pv uintptr
	hr, _, _ := procCoCreateInstance.Call(
		uintptr(unsafe.Pointer(&clsidTaskbarList)),
		0,
		0x17, // CLSCTX_ALL
		uintptr(unsafe.Pointer(&iidITaskbarList3)),
		uintptr(unsafe.Pointer(&pv)),
	)
	if hr != 0 {
		return
	}

	tb := (*iTaskbarList3)(unsafe.Pointer(pv))
	syscall.Syscall(tb.vtbl.HrInit, 1, pv, 0, 0)

	// Process progress updates on this COM-initialized thread
	for pct := range taskbarCh {
		if pct <= 0 || pct >= 100 {
			syscall.Syscall(tb.vtbl.SetProgressState, 3, pv, hwnd, tbpfNoProgress)
		} else {
			syscall.Syscall(tb.vtbl.SetProgressState, 3, pv, hwnd, tbpfNormal)
			syscall.Syscall6(tb.vtbl.SetProgressValue, 4, pv, hwnd, uintptr(uint64(pct)), uintptr(uint64(100)), 0, 0)
		}
	}
}

func findWindowByPID(targetPID uint32) uintptr {
	var result uintptr
	cb := syscall.NewCallback(func(hwnd, lparam uintptr) uintptr {
		var pid uint32
		procGetWindowThreadProcessId.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
		if pid == uint32(lparam) {
			visible, _, _ := procIsWindowVisible.Call(hwnd)
			if visible != 0 {
				result = hwnd
				return 0 // stop enumeration
			}
		}
		return 1 // continue
	})
	procEnumWindows.Call(cb, uintptr(targetPID))
	return result
}

func setTaskbarProgress(percent float64) {
	if taskbarCh != nil {
		select {
		case taskbarCh <- percent:
		default:
		}
	}
}
