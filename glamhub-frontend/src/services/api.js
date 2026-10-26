import axios from 'axios'

// Every backend call the UI depends on lives in this one file.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  try {
    const auth = JSON.parse(localStorage.getItem('glamhub_auth'))
    if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`
  } catch { /* not logged in */ }
  return config
})

const get = (path, params) => api.get(path, { params }).then((r) => r.data)
const post = (path, body, params) => api.post(path, body, { params }).then((r) => r.data)
const put = (path, body) => api.put(path, body).then((r) => r.data)
const del = (path) => api.delete(path).then((r) => r.data)
const form = (path, fd, method = 'post') => api[method](path, fd).then((r) => r.data)

export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.code === 'ERR_NETWORK' ? "We can't reach the server right now. Please try again in a moment." : fallback)

// ---------- auth ----------
export const registerArtist = (body) => post('/auth/register', body)
export const registerCustomer = (body) => post('/auth/register-customer', body)
export const login = (email, password) => post('/auth/login', { email, password })
export const adminLogin = (email, password) => post('/auth/admin-login', { email, password })
export const forgotPassword = (email) => post('/auth/forgot-password', { email })
export const verifyResetOtp = (email, otp) => post('/auth/verify-reset-otp', { email, otp })
export const resetPassword = (token, newPassword) => post('/auth/reset-password', { token, newPassword })

// ---------- discovery ----------
export const getDistricts = () => get('/artists/districts')
export const getSlots = () => get('/artists/slots')
export const searchArtists = ({ q, district, budget, category, page = 0, size = 12 }) =>
  get('/artists/search', { q: q || undefined, district: district || undefined, budget: budget || undefined, category: category || undefined, page, size })
export const getArtist = (id) => get(`/artists/${id}`)
export const getArtistPortfolio = (id) => get(`/artists/${id}/portfolio`)
export const getArtistPackages = (id) => get(`/artists/${id}/packages`)
export const getArtistAvailability = (id, from, to) => get(`/artists/${id}/availability`, { from, to })
export const getArtistReviews = (id) => get('/reviews', { artistId: id })
export const getShowcase = (limit = 12) => get('/showcase', { limit })
export const getPalettes = () => get('/palettes')
export const getLooks = () => get('/looks')
export const getPublicDepositPercent = () => get('/booking-money/public')

// ---------- artist workspace ----------
export const getMyArtist = () => get('/artists/me')
export const updateMyArtist = (body) => put('/artists/me', body)
export const getMyPackages = () => get('/packages')
export const createPackage = (body) => post('/packages', body)
export const updatePackage = (id, body) => put(`/packages/${id}`, body)
export const deletePackage = (id) => del(`/packages/${id}`)
export const getMyPortfolio = () => get('/portfolio')
export const uploadPortfolio = (file, category, caption) => {
  const fd = new FormData()
  fd.append('file', file)
  if (category) fd.append('category', category)
  if (caption) fd.append('caption', caption)
  return form('/portfolio', fd)
}
export const updatePortfolio = (id, body) => put(`/portfolio/${id}`, body)
export const deletePortfolio = (id) => del(`/portfolio/${id}`)
export const setAvailability = (date, status) => put(`/availability/${date}`, { status })
export const getMyReviews = () => get('/reviews/mine')
export const replyToReview = (id, reply) => put(`/reviews/${id}/reply`, { reply })
export const getBadgeStatus = () => get('/blue-badge/status')
export const purchaseBadge = () => post('/blue-badge/purchase')

// ---------- bookings (guests pass the booking's secret key) ----------
export const createBooking = (body) => post('/bookings', body)
export const getBooking = (id, key) => get(`/bookings/${id}`, { key })
export const chooseVerification = (id, key, method) => post(`/bookings/${id}/verification-method`, { method }, { key })
export const confirmBookingCode = (id, key, code) => post(`/bookings/${id}/confirm-otp`, { code }, { key })
export const verifyQrToken = (token) => post(`/bookings/verify-qr/${token}`)
export const initiateDeposit = (id, key) => post(`/bookings/${id}/deposit/initiate`, null, { key })
export const getMyBookings = () => get('/bookings/mine')
export const getArtistBookings = () => get('/bookings/artist')
export const updateBookingStatus = (id, status) => put(`/bookings/${id}/status`, { status })
export const getBookingQr = (id) => get(`/bookings/${id}/qr-code`)
export const createReview = (body, key) => post('/reviews', body, { key })

// ---------- account ----------
export const getAccount = () => get('/account/me')
export const updateAccount = (body) => put('/account/me', body)
export const uploadAccountPhoto = (file) => { const fd = new FormData(); fd.append('file', file); return form('/account/me/photo', fd) }
export const getDeletionRequest = () => get('/account/deletion-request')
export const requestDeletion = (reason) => post('/account/deletion-request', { reason })
export const cancelDeletionRequest = () => del('/account/deletion-request')

// ---------- AI ----------
export const askWidget = (message, history) => post('/chatbot/ask', { message, history })
export const sendAiMessage = (body) => post('/ai-chat/messages', body)
export const transcribeAudio = (blob, filename) => { const fd = new FormData(); fd.append('audio', blob, filename); return form('/ai-chat/transcribe', fd) }
export const getConversations = () => get('/ai-chat/conversations')
export const getConversationMessages = (id) => get(`/ai-chat/conversations/${id}/messages`)
export const deleteConversation = (id) => del(`/ai-chat/conversations/${id}`)

// ---------- admin ----------
export const adminOverview = () => get('/admin/overview')
export const adminWhoAmI = () => get('/admin/whoami')
export const adminReviews = () => get('/admin/reviews')
export const adminRemoveReview = (id) => put(`/admin/reviews/${id}/remove`)
export const adminPhotos = (status) => get('/admin/photos', { status: status || undefined })
export const adminApprovePhoto = (id) => put(`/admin/photos/${id}/approve`)
export const adminRejectPhoto = (id, note) => put(`/admin/photos/${id}/reject`, { note })
export const adminDeepCheck = (id) => post(`/admin/photos/${id}/ai-check`)
export const adminUsers = (role) => get('/admin/users', { role: role || undefined })
export const adminVerifyUser = (id) => put(`/admin/users/${id}/verify`)
export const adminBanUser = (id) => put(`/admin/users/${id}/ban`)
export const adminDeleteUser = (id) => del(`/admin/users/${id}`)
export const adminDeletionRequests = () => get('/admin/deletion-requests')
export const adminApproveDeletion = (id) => put(`/admin/deletion-requests/${id}/approve`)
export const adminRejectDeletion = (id, note) => put(`/admin/deletion-requests/${id}/reject`, { note })
export const adminSavePalette = (id, body) => (id ? put(`/admin/palettes/${id}`, body) : post('/admin/palettes', body))
export const adminDeletePalette = (id) => del(`/admin/palettes/${id}`)
export const adminSaveLook = (id, body) => (id ? put(`/admin/looks/${id}`, body) : post('/admin/looks', body))
export const adminDeleteLook = (id) => del(`/admin/looks/${id}`)
export const adminLookImage = (id, file) => { const fd = new FormData(); fd.append('file', file); return form(`/admin/looks/${id}/image`, fd) }
export const adminRemoveLookImage = (id) => del(`/admin/looks/${id}/image`)
export const adminStaff = (role) => get('/admin/staff', { role })
export const adminCreateStaff = (body) => post('/admin/staff', body)
export const adminDeleteStaff = (id) => del(`/admin/staff/${id}`)
export const adminBadgeSettings = () => get('/admin/blue-badge/settings')
export const adminUpdateBadgePrice = (price) => put('/admin/blue-badge/settings', { price })
export const adminBadgeHolders = () => get('/admin/blue-badge/holders')
export const adminRevokeBadge = (id) => put(`/admin/blue-badge/holders/${id}/revoke`)
export const adminMoneySettings = () => get('/admin/booking-money/settings')
export const adminUpdateMoney = (percent) => put('/admin/booking-money/settings', { percent })
