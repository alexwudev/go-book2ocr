package app

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

func (a *App) statsPath() string {
	return filepath.Join(a.exeDir(), "stats.json")
}

func (a *App) loadStats() {
	data, err := os.ReadFile(a.statsPath())
	if err != nil {
		return
	}
	json.Unmarshal(data, &a.stats)
}

func (a *App) saveStats() {
	data, err := json.MarshalIndent(a.stats, "", "  ")
	if err != nil {
		return
	}
	os.WriteFile(a.statsPath(), data, 0644)
}

// RecordApiCall increments the API call count for today + provider + plan.
// Thread-safe; called from concurrent OCR workers.
func (a *App) RecordApiCall(provider, plan string) {
	today := time.Now().Format("2006-01-02")

	a.statsMu.Lock()
	defer a.statsMu.Unlock()

	for i := range a.stats.Records {
		r := &a.stats.Records[i]
		if r.Date == today && r.Provider == provider && r.Plan == plan {
			r.Count++
			a.saveStats()
			return
		}
	}

	a.stats.Records = append(a.stats.Records, UsageRecord{
		Date:     today,
		Provider: provider,
		Plan:     plan,
		Count:    1,
	})
	a.saveStats()
}

// GetUsageStats returns all usage records to the frontend
func (a *App) GetUsageStats() UsageStats {
	a.statsMu.Lock()
	defer a.statsMu.Unlock()
	return a.stats
}

// ClearUsageStats removes all usage records
func (a *App) ClearUsageStats() {
	a.statsMu.Lock()
	defer a.statsMu.Unlock()
	a.stats = UsageStats{}
	a.saveStats()
}
