export class Timer {
    constructor(elementId) {
        this.elementId = elementId;
        this.startTime = 0;
        this.intervalId = null;
    }

    start() {
        this.stop();
        this.startTime = Date.now();
        const el = document.getElementById(this.elementId);
        if (el) el.textContent = '00:00';
        this.intervalId = setInterval(() => {
            const el = document.getElementById(this.elementId);
            if (el) el.textContent = this._format(Date.now() - this.startTime);
        }, 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.startTime > 0) {
            const el = document.getElementById(this.elementId);
            if (el) el.textContent = this._format(Date.now() - this.startTime);
        }
    }

    reset() {
        this.stop();
        this.startTime = 0;
        const el = document.getElementById(this.elementId);
        if (el) el.textContent = '';
    }

    _format(ms) {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
}
