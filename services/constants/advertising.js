const advertisements = [
	{
		name: 'monad_api',
		modal: 'api',
		icon: 'slash',
		header: 'Try out Monad API',
		body: 'Explore the power of Monad: Fast, Scalable and EVM-compatible Blockchain.',
		footer: 'Get started',
		weight: 0.5,
	},
	{
		name: 'monad_docs',
		link: 'https://docs.monad.xyz',
		icon: 'zap',
		header: 'Monad Documentation',
		body: 'Learn about Monad\'s high-performance EVM blockchain.',
		footer: 'View Docs',
		weight: 0.3,
	},
	{
		name: 'monad_testnet',
		link: 'https://testnet.monad.xyz',
		icon: 'validator',
		header: 'Monad Testnet',
		body: 'Experience the speed of Monad on public testnet.',
		footer: 'Try Testnet',
		weight: 0.2,
	},
]

export function getRandomAdv() {
    const randomNum = Math.random()

    let cumWeight = 0
    for (let ad of advertisements.filter(el => el.weight <= 1)) {
        cumWeight += ad.weight
        if (randomNum <= cumWeight) {
            return ad
        }
    }
}

export function getAdvByName(name) {
	let adv = {}
	advertisements.forEach(el => {
		if (el.name === name) {
			adv = el
		}
	})

	return adv
}

export const banners = [
	{
		title: 'Monad Blockchain',
		url: 'https://monad.xyz',
		body: 'The power of Monad: Fast, Scalable and EVM-compatible Blockchain.',
		image: 'mammoth.jpeg',
		openType: '_blank',
	},
]
