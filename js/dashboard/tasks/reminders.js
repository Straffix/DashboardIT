(function initializeDashboardTaskRemindersModule() {
	const dashboardModules = (window.DashboardModules = window.DashboardModules || {})
	const escapeHtml =
		window.AppUtils?.escapeHtml ||
		(value =>
			String(value || '')
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;'))

	const writeWaveString = (view, offset, value) => {
		for (let index = 0; index < value.length; index += 1) {
			view.setUint8(offset + index, value.charCodeAt(index))
		}
	}

	const createReminderToneUrl = () => {
		const sampleRate = 24000
		const notes = [
			{ frequency: 740, duration: 0.18, pause: 0.05 },
			{ frequency: 932.33, duration: 0.18, pause: 0.06 },
			{ frequency: 1174.66, duration: 0.24, pause: 0 },
		]
		const totalDuration = notes.reduce((sum, note) => sum + note.duration + (note.pause || 0), 0) + 0.08
		const totalSamples = Math.ceil(totalDuration * sampleRate)
		const audioBuffer = new ArrayBuffer(44 + totalSamples * 2)
		const view = new DataView(audioBuffer)
		const attackSamples = Math.max(1, Math.floor(sampleRate * 0.012))
		const releaseSamples = Math.max(1, Math.floor(sampleRate * 0.035))
		let sampleCursor = 0

		writeWaveString(view, 0, 'RIFF')
		view.setUint32(4, 36 + totalSamples * 2, true)
		writeWaveString(view, 8, 'WAVE')
		writeWaveString(view, 12, 'fmt ')
		view.setUint32(16, 16, true)
		view.setUint16(20, 1, true)
		view.setUint16(22, 1, true)
		view.setUint32(24, sampleRate, true)
		view.setUint32(28, sampleRate * 2, true)
		view.setUint16(32, 2, true)
		view.setUint16(34, 16, true)
		writeWaveString(view, 36, 'data')
		view.setUint32(40, totalSamples * 2, true)

		notes.forEach(note => {
			const noteSamples = Math.max(1, Math.floor(note.duration * sampleRate))
			const pauseSamples = Math.max(0, Math.floor((note.pause || 0) * sampleRate))

			for (let index = 0; index < noteSamples && sampleCursor < totalSamples; index += 1) {
				const attackProgress = index < attackSamples ? index / attackSamples : 1
				const releaseProgress = index >= noteSamples - releaseSamples ? (noteSamples - index) / releaseSamples : 1
				const envelope = Math.max(0, Math.min(1, attackProgress, releaseProgress))
				const time = index / sampleRate
				const harmonic = Math.sin(2 * Math.PI * note.frequency * time)
				const overtone = Math.sin(2 * Math.PI * note.frequency * 2 * time) * 0.18
				const sample = Math.max(-1, Math.min(1, (harmonic + overtone) * envelope * 0.36))

				view.setInt16(44 + sampleCursor * 2, Math.round(sample * 32767), true)
				sampleCursor += 1
			}

			sampleCursor = Math.min(totalSamples, sampleCursor + pauseSamples)
		})

		return URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/wav' }))
	}

	const supportsTaskSystemNotifications = () =>
		typeof window.Notification !== 'undefined' && (window.isSecureContext || window.location.protocol === 'file:')

	const supportsTaskServiceWorkerNotifications = () =>
		typeof window.Notification !== 'undefined' &&
		typeof navigator !== 'undefined' &&
		'serviceWorker' in navigator &&
		window.isSecureContext

	const buildTaskReminderHeading = (task, reminderState) =>
		reminderState === 'overdue' ? `Przypomnienie: ${task.title}` : `Za 5 minut: ${task.title}`

	const buildTaskReminderSubtitle = (task, reminderState) => {
		const description = task.description?.trim() || 'Zaplanowane zadanie'
		return reminderState === 'overdue' ? `Zaplanowane na ${task.time} - ${description}` : `${task.time} - ${description}`
	}

	dashboardModules.createTaskReminderController = ({ taskToastStack, onTaskSelected } = {}) => {
		let reminderAudioContext = null
		let reminderAudioElement = null
		let reminderAudioSourceUrl = ''
		let lastTaskReminderSoundAt = 0
		let isTaskReminderSoundPending = false
		let hasRequestedNotificationPermission = false
		let serviceWorkerRegistration = null
		let serviceWorkerRegistrationPromise = null
		const activeTaskNotifications = new Map()
		const reminderAppUrl = new URL('./index.html', window.location.href).toString()
		const reminderAudioUnlockEvents = ['pointerdown', 'keydown', 'touchstart']

		const getReminderId = task => `${task.id}-${task.date}-${task.time}`

		const getReminderAudioElement = () => {
			if (!reminderAudioElement) {
				reminderAudioSourceUrl = reminderAudioSourceUrl || createReminderToneUrl()
				reminderAudioElement = new Audio(reminderAudioSourceUrl)
				reminderAudioElement.preload = 'auto'
				reminderAudioElement.setAttribute('playsinline', '')
			}

			return reminderAudioElement
		}

		const getReminderAudioContext = () => {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext
			if (!AudioContextClass) return null

			if (!reminderAudioContext) {
				reminderAudioContext = new AudioContextClass()
			}

			return reminderAudioContext
		}

		const unlockReminderAudio = async () => {
			const audioContext = getReminderAudioContext()
			if (!audioContext) return null

			if (audioContext.state !== 'running') {
				try {
					await audioContext.resume()
				} catch (error) {
					return null
				}
			}

			return audioContext.state === 'running' ? audioContext : null
		}

		const registerReminderServiceWorker = async () => {
			if (!supportsTaskServiceWorkerNotifications()) return null
			if (serviceWorkerRegistration) return serviceWorkerRegistration
			if (serviceWorkerRegistrationPromise) return serviceWorkerRegistrationPromise

			serviceWorkerRegistrationPromise = navigator.serviceWorker
				.register('./sw.js', { scope: './' })
				.then(() => navigator.serviceWorker.ready)
				.then(registration => {
					serviceWorkerRegistration = registration
					return registration
				})
				.catch(() => null)
				.finally(() => {
					serviceWorkerRegistrationPromise = null
				})

			return serviceWorkerRegistrationPromise
		}

		const closeServiceWorkerNotifications = async reminderId => {
			const registration = serviceWorkerRegistration || (await registerReminderServiceWorker())
			if (!registration?.getNotifications) return

			const notifications = await registration.getNotifications(reminderId ? { tag: reminderId } : undefined)
			notifications.forEach(notification => notification.close())
		}

		const handleServiceWorkerMessage = event => {
			const payload = event.data
			if (payload?.type !== 'dashboard-task-notification-click' || !payload.task) return

			window.focus()
			onTaskSelected?.(payload.task)
		}

		const detachReminderAudioUnlockListeners = () => {
			reminderAudioUnlockEvents.forEach(eventName => {
				document.removeEventListener(eventName, handleReminderAudioUnlockAttempt, true)
			})
		}

		const handleReminderAudioUnlockAttempt = () => {
			void unlockReminderAudio().then(audioContext => {
				if (!audioContext) return
				detachReminderAudioUnlockListeners()
			})
		}

		const playTaskReminderAudioElement = async () => {
			const audioElement = getReminderAudioElement()
			if (!audioElement) return false

			try {
				audioElement.pause()
				audioElement.currentTime = 0
				audioElement.muted = false
				audioElement.volume = 0.95

				const playbackPromise = audioElement.play()
				if (playbackPromise?.catch) {
					await playbackPromise
				}

				return true
			} catch (error) {
				return false
			}
		}

		const playTaskReminderWebTone = async () => {
			const audioContext = await unlockReminderAudio()
			if (!audioContext) return false

			const startAt = audioContext.currentTime + 0.02
			const masterGain = audioContext.createGain()
			masterGain.gain.setValueAtTime(0.0001, startAt)
			masterGain.connect(audioContext.destination)

			const notes = [
				{ frequency: 740, duration: 0.16, delay: 0 },
				{ frequency: 932.33, duration: 0.16, delay: 0.2 },
				{ frequency: 1174.66, duration: 0.22, delay: 0.4 },
			]

			notes.forEach(note => {
				const oscillator = audioContext.createOscillator()
				const gain = audioContext.createGain()
				const noteStart = startAt + note.delay
				const noteEnd = noteStart + note.duration

				oscillator.type = 'triangle'
				oscillator.frequency.setValueAtTime(note.frequency, noteStart)

				gain.gain.setValueAtTime(0.0001, noteStart)
				gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.025)
				gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd)

				oscillator.connect(gain)
				gain.connect(masterGain)
				oscillator.start(noteStart)
				oscillator.stop(noteEnd + 0.04)
			})

			masterGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.72)
			return true
		}

		const requestNotificationPermission = async () => {
			if (!supportsTaskSystemNotifications()) return 'unsupported'
			await registerReminderServiceWorker()
			if (Notification.permission !== 'default') return Notification.permission
			if (hasRequestedNotificationPermission) return Notification.permission

			hasRequestedNotificationPermission = true

			try {
				return await Notification.requestPermission()
			} catch (error) {
				return Notification.permission || 'default'
			}
		}

		const closeTaskSystemNotification = async reminderId => {
			await closeServiceWorkerNotifications(reminderId)

			const notification = activeTaskNotifications.get(reminderId)
			if (!notification) return

			activeTaskNotifications.delete(reminderId)
			notification.onclose = null
			notification.close()
		}

		const closeActiveSystemNotifications = async () => {
			await closeServiceWorkerNotifications()

			activeTaskNotifications.forEach((notification, reminderId) => {
				activeTaskNotifications.delete(reminderId)
				notification.onclose = null
				notification.close()
			})
		}

		const showTaskSystemNotification = async (task, { reminderState = 'upcoming' } = {}) => {
			if (!supportsTaskSystemNotifications()) return
			if (Notification.permission !== 'granted') return
			if (document.visibilityState === 'visible' && document.hasFocus()) return

			const reminderId = getReminderId(task)
			await closeTaskSystemNotification(reminderId)

			const title = buildTaskReminderHeading(task, reminderState)
			const body = buildTaskReminderSubtitle(task, reminderState)
			const registration = await registerReminderServiceWorker()
			if (registration?.showNotification) {
				try {
					await registration.showNotification(title, {
						body,
						tag: reminderId,
						renotify: true,
						requireInteraction: true,
						silent: false,
						data: {
							type: 'dashboard-task-reminder',
							task,
							url: reminderAppUrl,
						},
					})
					window.setTimeout(() => {
						void closeServiceWorkerNotifications(reminderId)
					}, 16000)
					return
				} catch (error) {
					// Fall back to the page-level Notifications API when service workers are unavailable.
				}
			}

			let notification = null

			try {
				notification = new Notification(title, {
					body,
					tag: reminderId,
					renotify: true,
					requireInteraction: true,
					silent: false,
				})
			} catch (error) {
				return
			}

			activeTaskNotifications.set(reminderId, notification)
			notification.onclose = () => {
				activeTaskNotifications.delete(reminderId)
			}
			notification.onclick = () => {
				window.focus()
				onTaskSelected?.(task)
				notification.close()
			}

			window.setTimeout(() => {
				void closeTaskSystemNotification(reminderId)
			}, 16000)
		}

		const shouldPlayTaskReminderSound = () => true

		const playTaskReminderSound = async () => {
			const now = Date.now()
			if (now - lastTaskReminderSoundAt < 1800) return
			if (isTaskReminderSoundPending) return
			if (!shouldPlayTaskReminderSound()) return

			isTaskReminderSoundPending = true

			try {
				const played = (await playTaskReminderWebTone()) || (await playTaskReminderAudioElement())
				if (!played) return

				lastTaskReminderSoundAt = Date.now()
			} finally {
				isTaskReminderSoundPending = false
			}
		}

		const showTaskToast = task => {
			if (!taskToastStack) return

			const subtitle = buildTaskReminderSubtitle(task, 'upcoming')
			const priorityClass =
				task?.priority === 'low' ? 'is-low' : task?.priority === 'medium' ? 'is-medium' : 'is-high'
			const toast = document.createElement('article')
			toast.className = `task-toast ${priorityClass}`
			toast.innerHTML = `
				<div class="task-toast-dot ${priorityClass}"></div>
				<div class="task-toast-copy">
					<strong>Za 5 minut: ${escapeHtml(task.title)}</strong>
					<span>${escapeHtml(subtitle)}</span>
				</div>
				<button type="button" class="task-toast-close" aria-label="Zamknij przypomnienie">
					<i class="fa-solid fa-xmark"></i>
				</button>
			`

			const removeToast = () => {
				toast.classList.add('is-leaving')
				window.setTimeout(() => toast.remove(), 220)
			}

			taskToastStack.appendChild(toast)
			toast.querySelector('.task-toast-close')?.addEventListener('click', removeToast)
			window.setTimeout(removeToast, 9000)
		}

		const showLateTaskToast = task => {
			if (!taskToastStack) return

			const subtitle = buildTaskReminderSubtitle(task, 'overdue')
			const priorityClass =
				task?.priority === 'low' ? 'is-low' : task?.priority === 'medium' ? 'is-medium' : 'is-high'
			const toast = document.createElement('article')
			toast.className = `task-toast ${priorityClass}`
			toast.innerHTML = `
				<div class="task-toast-dot ${priorityClass}"></div>
				<div class="task-toast-copy">
					<strong>Przypomnienie: ${escapeHtml(task.title)}</strong>
					<span>${escapeHtml(subtitle)}</span>
				</div>
				<button type="button" class="task-toast-close" aria-label="Zamknij przypomnienie">
					<i class="fa-solid fa-xmark"></i>
				</button>
			`

			const removeToast = () => {
				toast.classList.add('is-leaving')
				window.setTimeout(() => toast.remove(), 220)
			}

			taskToastStack.appendChild(toast)
			toast.querySelector('.task-toast-close')?.addEventListener('click', removeToast)
			window.setTimeout(removeToast, 9000)
		}

		const notify = (task, { reminderState = 'upcoming' } = {}) => {
			if (reminderState === 'overdue') {
				showLateTaskToast(task)
			} else {
				showTaskToast(task)
			}

			void showTaskSystemNotification(task, { reminderState })
			void playTaskReminderSound()
		}

		const prepareForPlannerInteraction = () => {
			void registerReminderServiceWorker()
			handleReminderAudioUnlockAttempt()
		}

		if (supportsTaskServiceWorkerNotifications()) {
			navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
			void registerReminderServiceWorker()
		}

		reminderAudioUnlockEvents.forEach(eventName => {
			document.addEventListener(eventName, handleReminderAudioUnlockAttempt, true)
		})

		const destroy = () => {
			void closeActiveSystemNotifications()
			if (supportsTaskServiceWorkerNotifications()) {
				navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
			}
			detachReminderAudioUnlockListeners()

			if (reminderAudioElement) {
				reminderAudioElement.pause()
				reminderAudioElement = null
			}

			if (reminderAudioSourceUrl) {
				URL.revokeObjectURL(reminderAudioSourceUrl)
				reminderAudioSourceUrl = ''
			}

			if (reminderAudioContext?.state !== 'closed') {
				void reminderAudioContext?.close?.()
			}

			reminderAudioContext = null
		}

		return {
			destroy,
			getReminderId,
			notify,
			prepareForPlannerInteraction,
			requestNotificationPermission,
			closeActiveSystemNotifications,
		}
	}
})()
