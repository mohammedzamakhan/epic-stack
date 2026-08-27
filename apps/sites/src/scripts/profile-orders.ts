import { loadOrders } from './profile-shop-data'

export function initProfileOrdersPage() {
	const pageRoot = document.getElementById('profile-orders-root')
	const noOrders = pageRoot?.dataset.noOrders || 'No orders yet.'
	const noOrdersHint = pageRoot?.dataset.noOrdersHint
	const browseShop = pageRoot?.dataset.browseShop
	const shopHref = pageRoot?.dataset.shopHref
	const orderHistory = document.getElementById('order-history')
	const orderHistoryLoading = document.getElementById('order-history-loading')

	void loadOrders({
		orderHistory,
		orderHistoryLoading,
		noOrders,
		noOrdersHint,
		browseShop,
		shopHref,
	})
}

if (document.getElementById('profile-orders-root')) {
	initProfileOrdersPage()
}
