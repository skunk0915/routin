class RoutineTimer {
    constructor() {
        this.routines = JSON.parse(localStorage.getItem('routines') || '[]');
        this.activeTimers = new Map();
        this.notificationPermission = Notification.permission;
        
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.bindEvents();
        this.renderRoutines();
        this.updateNotificationStatus();
        this.setupServiceWorkerMessageListener();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    bindEvents() {
        document.getElementById('add-routine-btn').addEventListener('click', () => {
            this.addRoutine();
        });

        document.getElementById('enable-notifications').addEventListener('click', () => {
            this.requestNotificationPermission();
        });

        document.getElementById('routine-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addRoutine();
            }
        });

        document.getElementById('routine-duration').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addRoutine();
            }
        });
    }

    addRoutine() {
        const nameInput = document.getElementById('routine-name');
        const durationInput = document.getElementById('routine-duration');
        
        const name = nameInput.value.trim();
        const duration = parseInt(durationInput.value);

        if (!name || !duration || duration <= 0) {
            alert('名称と時間（1分以上）を入力してください。');
            return;
        }

        const routine = {
            id: Date.now(),
            name: name,
            duration: duration,
            isActive: false
        };

        this.routines.push(routine);
        this.saveRoutines();
        this.renderRoutines();

        nameInput.value = '';
        durationInput.value = '';
    }

    deleteRoutine(id) {
        if (this.activeTimers.has(id)) {
            this.stopTimer(id);
        }
        
        this.routines = this.routines.filter(routine => routine.id !== id);
        this.saveRoutines();
        this.renderRoutines();
    }

    startTimer(id) {
        const routine = this.routines.find(r => r.id === id);
        if (!routine || routine.isActive) return;

        routine.isActive = true;
        routine.startTime = Date.now();
        routine.remainingTime = routine.duration * 60 * 1000;

        const timer = setInterval(() => {
            const elapsed = Date.now() - routine.startTime;
            const remaining = routine.duration * 60 * 1000 - elapsed;

            if (remaining <= 0) {
                this.completeTimer(id);
            } else {
                routine.remainingTime = remaining;
                this.updateTimerDisplay(id, remaining);
            }
        }, 1000);

        this.activeTimers.set(id, timer);
        this.saveRoutines();
        this.renderRoutines();
    }

    stopTimer(id) {
        const routine = this.routines.find(r => r.id === id);
        if (!routine || !routine.isActive) return;

        routine.isActive = false;
        delete routine.startTime;
        delete routine.remainingTime;

        if (this.activeTimers.has(id)) {
            clearInterval(this.activeTimers.get(id));
            this.activeTimers.delete(id);
        }

        this.saveRoutines();
        this.renderRoutines();
    }

    completeTimer(id) {
        const routine = this.routines.find(r => r.id === id);
        if (!routine) return;

        this.stopTimer(id);
        this.showNotification(routine.name);
        
        // タイマー完了後に自動再開
        setTimeout(() => {
            this.startTimer(id);
        }, 1000);
    }

    updateTimerDisplay(id, remainingTime) {
        const timerElement = document.querySelector(`[data-routine-id="${id}"] .routine-timer`);
        if (timerElement) {
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    async showNotification(routineName) {
        // 音声アラートも追加（iOS PWA対応）
        this.playNotificationSound();
        
        // 画面に視覚的な通知も表示
        this.showVisualAlert(routineName);
        
        if (this.notificationPermission === 'granted') {
            try {
                // iOS PWAでの通知改善
                if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
                    const registration = await navigator.serviceWorker.getRegistration();
                    if (registration) {
                        await registration.showNotification(`${routineName} 完了！`, {
                            body: `${routineName}の時間が終了しました。タイマーが再開されます。`,
                            icon: './img/favicon/android-chrome-192x192.png',
                            badge: './img/favicon/android-chrome-192x192.png',
                            vibrate: [300, 100, 300, 100, 300],
                            tag: 'routine-complete',
                            requireInteraction: false,
                            silent: false,
                            timestamp: Date.now(),
                            actions: [
                                {
                                    action: 'stop',
                                    title: '停止',
                                    icon: './img/favicon/favicon-32x32.png'
                                }
                            ]
                        });
                        return;
                    }
                }
                
                // フォールバック通知
                new Notification(`${routineName} 完了！`, {
                    body: `${routineName}の時間が終了しました。タイマーが再開されます。`,
                    icon: './img/favicon/android-chrome-192x192.png',
                    requireInteraction: false
                });
            } catch (error) {
                console.log('通知の表示に失敗:', error);
            }
        }
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            this.updateNotificationStatus();
        } catch (error) {
            console.error('通知権限の要求に失敗しました:', error);
        }
    }

    updateNotificationStatus() {
        const statusElement = document.getElementById('notification-permission-status');
        const enableButton = document.getElementById('enable-notifications');

        switch (this.notificationPermission) {
            case 'granted':
                statusElement.textContent = '通知が有効になっています。';
                statusElement.className = 'status-text success';
                enableButton.style.display = 'none';
                break;
            case 'denied':
                statusElement.textContent = '通知が拒否されています。ブラウザの設定で許可してください。';
                statusElement.className = 'status-text error';
                enableButton.style.display = 'none';
                break;
            default:
                statusElement.textContent = '通知を有効にすると、ルーチン完了時にお知らせします。';
                statusElement.className = 'status-text warning';
                enableButton.style.display = 'inline-block';
        }
    }

    renderRoutines() {
        const container = document.getElementById('routines-container');
        
        if (this.routines.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">まだルーチンが登録されていません。</p>';
            return;
        }

        container.innerHTML = this.routines.map(routine => `
            <div class="routine-item ${routine.isActive ? 'active' : ''}" data-routine-id="${routine.id}">
                <div class="routine-info">
                    <div class="routine-name">${routine.name}</div>
                    <div class="routine-duration">${routine.duration}分</div>
                </div>
                <div class="routine-timer">
                    ${routine.isActive 
                        ? this.formatTime(routine.remainingTime || routine.duration * 60 * 1000)
                        : this.formatTime(routine.duration * 60 * 1000)
                    }
                </div>
                <div class="routine-controls">
                    ${routine.isActive 
                        ? `<button class="btn-stop" onclick="app.stopTimer(${routine.id})">停止</button>`
                        : `<button class="btn-start" onclick="app.startTimer(${routine.id})">開始</button>`
                    }
                    <button class="btn-delete" onclick="app.deleteRoutine(${routine.id})">削除</button>
                </div>
            </div>
        `).join('');
    }

    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    saveRoutines() {
        localStorage.setItem('routines', JSON.stringify(this.routines));
    }

    playNotificationSound() {
        // iOS PWA対応: 音声アラート
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // 複数回鳴らす
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();
            
            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);
            
            oscillator2.frequency.setValueAtTime(660, audioContext.currentTime);
            gainNode2.gain.setValueAtTime(0.1, audioContext.currentTime);
            
            oscillator2.start(audioContext.currentTime);
            oscillator2.stop(audioContext.currentTime + 0.3);
        }, 400);
    }

    showVisualAlert(routineName) {
        // 画面上にアラート表示
        const alertDiv = document.createElement('div');
        alertDiv.className = 'completion-alert';
        alertDiv.innerHTML = `
            <div class="alert-content">
                <h3>🎉 ${routineName} 完了！</h3>
                <p>タイマーが自動で再開されます</p>
                <button onclick="this.parentElement.parentElement.remove()">閉じる</button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // 5秒後に自動削除
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    setupServiceWorkerMessageListener() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.action === 'stopAllTimers') {
                    // 全てのアクティブタイマーを停止
                    this.routines.forEach(routine => {
                        if (routine.isActive) {
                            this.stopTimer(routine.id);
                        }
                    });
                }
            });
        }
    }
}

const app = new RoutineTimer();