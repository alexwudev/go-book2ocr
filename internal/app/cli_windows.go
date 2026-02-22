//go:build windows

package app

import "syscall"

// attachConsole re-attaches the parent process's console so that stdout/stderr
// work when the GUI executable (built with -H windowsgui) is invoked from a
// terminal.
func attachConsole() {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	proc := kernel32.NewProc("AttachConsole")
	const ATTACH_PARENT_PROCESS = ^uint32(0) // -1
	proc.Call(uintptr(ATTACH_PARENT_PROCESS))
}
