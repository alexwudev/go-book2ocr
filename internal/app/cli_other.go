//go:build !windows

package app

// attachConsole is a no-op on non-Windows platforms.
func attachConsole() {}
