import { RouterProvider, createBrowserRouter } from 'react-router-dom'

import { AppShell } from '../layouts/AppShell'
import { DashboardHomePage } from '../pages/dashboard-home/DashboardHomePage'
import { ExchangesPage } from '../pages/exchanges/ExchangesPage'
import { HiresPage } from '../pages/hires/HiresPage'
import { LunchPage } from '../pages/lunch/LunchPage'
import { MonitorPage } from '../pages/monitor/MonitorPage'
import { NotesPage } from '../pages/notes/NotesPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'

const router = createBrowserRouter([
	{
		path: '/',
		element: <AppShell />,
		children: [
			{
				index: true,
				element: <DashboardHomePage />,
			},
			{
				path: 'dashboard',
				element: <DashboardHomePage />,
			},
			{
				path: 'dashboard/monitor',
				element: <MonitorPage />,
			},
			{
				path: 'dashboard/exchanges',
				element: <ExchangesPage />,
			},
			{
				path: 'dashboard/hires',
				element: <HiresPage />,
			},
			{
				path: 'dashboard/lunch',
				element: <LunchPage />,
			},
			{
				path: 'dashboard/notes',
				element: <NotesPage />,
			},
			{
				path: '*',
				element: <NotFoundPage />,
			},
		],
	},
])

export function AppRouter() {
	return <RouterProvider router={router} />
}
