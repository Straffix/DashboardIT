import type { ReactNode } from 'react'

type PageIntroProps = {
	eyebrow: string
	title: string
	description: string
	actions?: ReactNode
}

export function PageIntro({ eyebrow, title, description, actions }: PageIntroProps) {
	return (
		<section className="page-intro">
			<div className="page-intro__copy">
				<p className="page-intro__eyebrow">{eyebrow}</p>
				<h2 className="page-intro__title">{title}</h2>
				<p className="page-intro__description">{description}</p>
			</div>

			{actions ? <div className="page-intro__actions">{actions}</div> : null}
		</section>
	)
}
