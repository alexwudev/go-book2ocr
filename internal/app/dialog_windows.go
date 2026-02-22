//go:build windows

package app

import (
	"runtime"
	"syscall"
	"unsafe"

	"github.com/go-ole/go-ole"
	"golang.org/x/sys/windows"
)

var (
	shell32                         = syscall.NewLazyDLL("shell32.dll")
	user32                          = syscall.NewLazyDLL("user32.dll")
	procSHCreateItemFromParsingName = shell32.NewProc("SHCreateItemFromParsingName")
	procGetForegroundWindow         = user32.NewProc("GetForegroundWindow")
)

var (
	clsidFileOpenDialog = ole.NewGUID("{DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7}")
	iidIFileOpenDialog  = ole.NewGUID("{d57c7288-d4ad-4768-be02-9d969532d960}")
	iidIShellItem       = ole.NewGUID("{43826D1E-E718-42EE-BC55-A1E261C37BFE}")
)

const (
	fosPickFolders   uint32 = 0x20
	fosFileMustExist uint32 = 0x1000
	sigdnFileSysPath uint32 = 0x80058000
)

// COM vtable indices (from Wails vtblCommon.go):
//
//	IUnknown       : 0 QueryInterface, 1 AddRef, 2 Release
//	IModalWindow   : 3 Show
//	IFileDialog    : 4 SetFileTypes, 5 SetFileTypeIndex, 6 GetFileTypeIndex,
//	  7 Advise, 8 Unadvise, 9 SetOptions, 10 GetOptions,
//	  11 SetDefaultFolder, 12 SetFolder, 13 GetFolder, 14 GetCurrentSelection,
//	  15 SetFileName, 16 GetFileName, 17 SetTitle, 18 SetOkButtonLabel,
//	  19 SetFileNameLabel, 20 GetResult, 21 AddPlace, 22 SetDefaultExtension,
//	  23 Close, 24 SetClientGuid, 25 ClearClientData, 26 SetFilter
//	IShellItem     : 0-2 IUnknown, 3 BindToHandler, 4 GetParent, 5 GetDisplayName

// vt returns the function pointer at vtable slot idx for the COM object at ptr.
func vt(ptr uintptr, idx int) uintptr {
	vtbl := *(*uintptr)(unsafe.Pointer(ptr))
	return *(*uintptr)(unsafe.Pointer(vtbl + uintptr(idx)*unsafe.Sizeof(uintptr(0))))
}

// selectDirectoryNative opens a Windows IFileOpenDialog with FOS_PICKFOLDERS.
// Unlike the Wails built-in OpenDirectoryDialog, this implementation does NOT
// call SetFileTypes, which avoids a known issue where the folder picker
// cannot confirm a folder selection on some Windows configurations.
func (a *App) selectDirectoryNative(title string, defaultDir string) (string, error) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	ole.CoInitializeEx(0, ole.COINIT_APARTMENTTHREADED|ole.COINIT_DISABLE_OLE1DDE)
	defer ole.CoUninitialize()

	// Create IFileOpenDialog
	unk, err := ole.CreateInstance(clsidFileOpenDialog, iidIFileOpenDialog)
	if err != nil {
		return "", err
	}
	dlg := uintptr(unsafe.Pointer(unk))
	defer syscall.SyscallN(vt(dlg, 2), dlg) // Release

	// GetOptions (index 10)
	var opts uint32
	ret, _, _ := syscall.SyscallN(vt(dlg, 10), dlg, uintptr(unsafe.Pointer(&opts)))
	if hrFailed(ret) {
		return "", ole.NewError(ret)
	}

	// SetOptions (index 9): add FOS_PICKFOLDERS, clear FOS_FILEMUSTEXIST
	opts = (opts | fosPickFolders) &^ fosFileMustExist
	ret, _, _ = syscall.SyscallN(vt(dlg, 9), dlg, uintptr(opts))
	if hrFailed(ret) {
		return "", ole.NewError(ret)
	}

	// SetTitle (index 17)
	if title != "" {
		tp, err := syscall.UTF16PtrFromString(title)
		if err == nil {
			syscall.SyscallN(vt(dlg, 17), dlg, uintptr(unsafe.Pointer(tp)))
		}
	}

	// SetFolder (index 12) – force dialog to open in this directory
	if defaultDir != "" {
		if si := newShellItem(defaultDir); si != 0 {
			syscall.SyscallN(vt(dlg, 12), dlg, si)
			syscall.SyscallN(vt(si, 2), si) // Release
		}
	}

	// Show (index 3) with foreground window as parent
	hwnd, _, _ := procGetForegroundWindow.Call()
	ret, _, _ = syscall.SyscallN(vt(dlg, 3), dlg, hwnd)
	if hrCancelled(ret) {
		return "", nil
	}
	if hrFailed(ret) {
		return "", ole.NewError(ret)
	}

	// GetResult (index 20)
	var resultItem uintptr
	ret, _, _ = syscall.SyscallN(vt(dlg, 20), dlg, uintptr(unsafe.Pointer(&resultItem)))
	if hrFailed(ret) || resultItem == 0 {
		return "", nil
	}
	defer syscall.SyscallN(vt(resultItem, 2), resultItem) // Release

	// IShellItem::GetDisplayName (index 5, SIGDN_FILESYSPATH)
	var pathPtr *uint16
	ret, _, _ = syscall.SyscallN(vt(resultItem, 5), resultItem, uintptr(sigdnFileSysPath), uintptr(unsafe.Pointer(&pathPtr)))
	if hrFailed(ret) {
		return "", ole.NewError(ret)
	}
	defer ole.CoTaskMemFree(uintptr(unsafe.Pointer(pathPtr)))

	return windows.UTF16PtrToString(pathPtr), nil
}

// newShellItem creates an IShellItem from a filesystem path.
func newShellItem(path string) uintptr {
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0
	}
	var item uintptr
	ret, _, _ := procSHCreateItemFromParsingName.Call(
		uintptr(unsafe.Pointer(p)),
		0,
		uintptr(unsafe.Pointer(iidIShellItem)),
		uintptr(unsafe.Pointer(&item)),
	)
	if ret != 0 {
		return 0
	}
	return item
}

func hrFailed(hr uintptr) bool {
	return int32(hr) < 0
}

func hrCancelled(hr uintptr) bool {
	// HRESULT_FROM_WIN32(ERROR_CANCELLED) = 0x800704C7
	return uint32(hr) == 0x800704C7
}
