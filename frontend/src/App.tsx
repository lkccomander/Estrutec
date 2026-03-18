import { startTransition, useDeferredValue, useEffect, useState, type FormEvent } from 'react'
import {
  HiOutlineAcademicCap,
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineFolderOpen,
  HiOutlineUsers,
} from 'react-icons/hi2'
import { IoBusinessOutline } from 'react-icons/io5'
import { MdAttachFile, MdContentCopy, MdOutlineFileDownload, MdOutlinePayments } from 'react-icons/md'
import './App.css'
import { ActionFeedback } from './components/ActionFeedback'
import { useI18n } from './i18n/useI18n'
import { IconsDashboard } from './modules/icons/IconsDashboard'
import { ProjectBudgetsDashboard } from './modules/budgets/ProjectBudgetsDashboard'
import { ExchangeRateDashboard } from './modules/exchange/ExchangeRateDashboard'
import { ProjectsDashboard } from './modules/projects/ProjectsDashboard'
import { UsersDashboard } from './modules/users/UsersDashboard'

type Role = 'ADMIN' | 'APROBADOR' | 'REGISTRADOR'
type Currency = 'CRC' | 'USD'
type ReceiptType = 'FACTURA_FOTO' | 'SINPE_MOVIL' | 'CAJA_CHICA'

type BudgetState = 'ACTIVO' | 'AGOTADO' | 'CERRADO'

type AuthUser = {
  usuario_id: string
  nombre: string
  email: string
  rol: Role
  activo: boolean
  created_at: string
}

type AuthResponse = {
  access_token: string
  token_type: string
  user: AuthUser
}

type Health = {
  status: string
  app?: string
  version?: string
  database?: string
  user?: string
}

type ExchangeRateEntry = {
  entity_type: string
  entity: string
  buy_rate: number
  sell_rate: number
  spread: number
  updated_at: string
}

type ExchangeRateHighlight = {
  entity_type: string
  entity: string
  rate: number
  updated_at: string
}

type ExchangeRateDashboardData = {
  source: string
  source_url: string
  report_date: string
  fetched_at: string
  average_buy_rate: number
  average_sell_rate: number
  average_spread: number
  best_buy: ExchangeRateHighlight
  best_sell: ExchangeRateHighlight
  entries: ExchangeRateEntry[]
}

type Project = {
  proyecto_id: string
  nombre_proyecto: string
  fecha_inicio_proyecto: string
  fecha_fin_proyecto?: string | null
  latitud?: string | null
  longitud?: string | null
  activo: boolean
  presupuesto_proyecto: string
  balance_proyecto: string
  created_at: string
  updated_at: string
}

type Budget = {
  presupuesto_id: string
  proyecto_id: string
  nombre_proyecto?: string | null
  monto_total: string
  categoria: string
  moneda: Currency
  saldo_disponible: string
  estado: string
  created_at: string
}

type Receipt = {
  comprobante_id: string
  presupuesto_id: string
  usuario_creador_id: string
  usuario_aprobador_id?: string | null
  fecha: string
  negocio: string
  descripcion: string
  monto_gasto: string
  moneda: Currency
  tipo_cambio?: string | null
  monto_presupuesto?: string | null
  tipo_comprobante: ReceiptType
  estado: string
  numero_referencia?: string | null
  numero_factura?: string | null
  cedula?: string | null
  observacion?: string | null
  balance?: string | null
  applied_at?: string | null
  created_at?: string
  updated_at?: string
}

type Movement = {
  movimiento_id: string
  presupuesto_id: string
  comprobante_id?: string | null
  usuario_id?: string | null
  tipo_movimiento: string
  monto: string
  saldo_anterior: string
  saldo_nuevo: string
  moneda: Currency
  descripcion?: string | null
  referencia_externa?: string | null
  created_at: string
}

type Attachment = {
  adjunto_id: string
  comprobante_id: string
  cdn_path: string
  nombre_archivo?: string | null
  tipo_archivo?: string | null
  orden: number
  created_at: string
}

type ApiError = {
  detail?: string
}

type FeedbackTone = 'warning' | 'success' | 'info'

type ActionFeedbackState = {
  target: string
  message: string
  tone: FeedbackTone
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

function formatMoney(amount: string, currency: Currency) {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

function formatGroupedMoney(entries: Array<{ amount: string; currency: Currency }>) {
  const totals = entries.reduce<Record<Currency, number>>(
    (accumulator, entry) => {
      accumulator[entry.currency] += Number(entry.amount)
      return accumulator
    },
    { CRC: 0, USD: 0 },
  )

  return (Object.entries(totals) as Array<[Currency, number]>)
    .filter(([, total]) => total > 0)
    .map(([currency, total]) => formatMoney(total.toFixed(2), currency))
    .join(' | ')
}

function formatNumberMask(value: number) {
  return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return ''
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describeDonutArc(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle)
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle)
  const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle)
  const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

function getStatusTone(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('invalida') ||
    normalized.includes('invalido') ||
    normalized.includes('expirada') ||
    normalized.includes('expirado') ||
    normalized.includes('pendiente') ||
    normalized.includes('sobrepasa') ||
    normalized.includes('no se pudo')
  ) {
    return 'warning'
  }

  if (
    normalized.includes('sesion iniciada') ||
    normalized.includes('creado') ||
    normalized.includes('aprobado') ||
    normalized.includes('eliminado')
  ) {
    return 'success'
  }

  return 'info'
}

function getApprovalFeedback(observacion?: string | null) {
  if (!observacion) {
    return null
  }

  if (observacion.includes('sobrepasa el saldo restante del presupuesto')) {
    return 'El comprobante no se puede aprobar porque su monto sobrepasa el saldo restante del presupuesto.'
  }

  if (observacion.includes('tipo de cambio')) {
    return 'El comprobante no se puede aprobar porque falta el tipo de cambio para convertirlo a la moneda del presupuesto.'
  }

  if (observacion.includes('moneda del comprobante no coincide')) {
    return 'El comprobante no se puede aprobar porque la moneda del comprobante no coincide con la del presupuesto.'
  }

  return null
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError
    throw new Error(error.detail ?? 'No se pudo completar la solicitud')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

function App() {
  const { t, toggleLanguage } = useI18n()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('elatilo_token'))
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [activeDashboard, setActiveDashboard] = useState<'home' | 'budgets' | 'budget-detail' | 'users' | 'icons' | 'accounts' | 'exchange'>(
    'home',
  )
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [dbHealth, setDbHealth] = useState<Health | null>(null)
  const [exchangeRateDashboard, setExchangeRateDashboard] = useState<ExchangeRateDashboardData | null>(null)
  const [exchangeRateError, setExchangeRateError] = useState<string | null>(null)
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false)
  const [users, setUsers] = useState<AuthUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectFilter, setProjectFilter] = useState<'active' | 'all' | 'archived'>('active')
  const [budgetSectionView, setBudgetSectionView] = useState<'projects' | 'budgets'>('projects')
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedBudgetId, setSelectedBudgetId] = useState('')
  const [selectedReceiptId, setSelectedReceiptId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [projectHistoryOffset, setProjectHistoryOffset] = useState(0)
  const [hiddenProjectHistoryIds, setHiddenProjectHistoryIds] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState(
    'Conecta el frontend con tu API local y empieza a registrar gastos.',
  )
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackState | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [receiptFilter, setReceiptFilter] = useState('')
  const deferredFilter = useDeferredValue(receiptFilter)
  const [loginForm, setLoginForm] = useState({
    email: 'andres.admin@example.com',
    password: 'Admin123!',
  })
  const [budgetForm, setBudgetForm] = useState({
    proyecto_id: '',
    categoria: '',
    monto_total: '0.00',
    moneda: 'CRC' as Currency,
  })
  const [budgetMaintenanceForm, setBudgetMaintenanceForm] = useState({
    proyecto_id: '',
    categoria: '',
    monto_total: '0.00',
    moneda: 'CRC' as Currency,
    estado: 'ACTIVO' as BudgetState,
  })
  const [projectForm, setProjectForm] = useState({
    nombre_proyecto: '',
    fecha_inicio_proyecto: new Date().toISOString().slice(0, 10),
    fecha_fin_proyecto: '',
    latitud: '',
    longitud: '',
  })
  const [receiptForm, setReceiptForm] = useState({
    presupuesto_id: '',
    usuario_creador_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    negocio: '',
    descripcion: '',
    monto_gasto: '0.00',
    moneda: 'CRC' as Currency,
    tipo_cambio: '',
    tipo_comprobante: 'FACTURA_FOTO' as ReceiptType,
    numero_referencia: '',
    numero_factura: '',
    cedula: '',
    observacion: '',
  })
  const [attachmentForm, setAttachmentForm] = useState({
    cdn_path: '',
    nombre_archivo: '',
    tipo_archivo: '',
    orden: '1',
  })
  const [isAttachmentBusy, setIsAttachmentBusy] = useState(false)
  const [isExportingApproved, setIsExportingApproved] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({})
  const [userForm, setUserForm] = useState({
    nombre: '',
    rol: 'REGISTRADOR' as Role,
  })
  const [createUserForm, setCreateUserForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'REGISTRADOR' as Role,
  })
  const [lastUpdate, setLastUpdate] = useState<string>('Sin sincronizar')
  const activeProjects = projects.filter((project) => project.activo)
  const activeBudgets = budgets.filter((budget) => budget.estado === 'ACTIVO')
  const activeBudgetIds = new Set(activeBudgets.map((budget) => budget.presupuesto_id))
  const nonRejectedReceipts = receipts.filter(
    (receipt) =>
      receipt.estado !== 'RECHAZADO' && activeBudgetIds.has(receipt.presupuesto_id),
  )
  const cashboxReceipts = nonRejectedReceipts.filter(
    (receipt) => receipt.tipo_comprobante === 'CAJA_CHICA',
  )
  const activeBudgetsTotalLabel =
    formatGroupedMoney(activeBudgets.map((budget) => ({ amount: budget.monto_total, currency: budget.moneda }))) ||
    'Sin montos'
  const receiptsTotalLabel =
    formatGroupedMoney(nonRejectedReceipts.map((receipt) => ({ amount: receipt.monto_gasto, currency: receipt.moneda }))) ||
    'Sin montos'
  const cashboxTotalLabel =
    formatGroupedMoney(cashboxReceipts.map((receipt) => ({ amount: receipt.monto_gasto, currency: receipt.moneda }))) ||
    'Sin montos'
  const projectHistorySeries = activeProjects
    .map((project) => {
      const projectBudgets = activeBudgets.filter((budget) => budget.proyecto_id === project.proyecto_id)
      const projectCurrencies = Array.from(new Set(projectBudgets.map((budget) => budget.moneda)))
      const canAggregateMoney = projectCurrencies.length === 1
      const projectReceipts = nonRejectedReceipts.filter((receipt) =>
        projectBudgets.some((budget) => budget.presupuesto_id === receipt.presupuesto_id),
      )
      const approvedProjectReceipts = projectReceipts
        .filter((receipt) => receipt.estado === 'APROBADO')
        .sort((left, right) => compareReceiptsByDateDesc(right, left))
      const expenseHistory = approvedProjectReceipts
        .filter((receipt) => receipt.tipo_comprobante !== 'CAJA_CHICA')
      const total = canAggregateMoney
        ? projectBudgets.reduce((sum, budget) => sum + Number(budget.monto_total), 0)
        : 0
      const available = canAggregateMoney
        ? projectBudgets.reduce((sum, budget) => sum + Number(budget.saldo_disponible), 0)
        : 0
      const totalCashbox = approvedProjectReceipts
        .filter((receipt) => receipt.tipo_comprobante === 'CAJA_CHICA')
        .reduce((sum, receipt) => sum + Number(receipt.monto_presupuesto ?? 0), 0)
      const initialBalance = Math.max(total - totalCashbox, 0)
      let runningBalance = initialBalance
      let runningTotal = initialBalance
      const history = approvedProjectReceipts.map((receipt) => {
        const amount = Number(receipt.monto_presupuesto ?? 0)
        runningBalance =
          receipt.tipo_comprobante === 'CAJA_CHICA'
            ? runningBalance + amount
            : runningBalance - amount

        return {
          date: receipt.fecha,
          balance: runningBalance,
        }
      })
      const totalHistory = approvedProjectReceipts.map((receipt) => {
        const amount = Number(receipt.monto_presupuesto ?? 0)

        if (receipt.tipo_comprobante === 'CAJA_CHICA') {
          runningTotal += amount
        }

        return {
          date: receipt.fecha,
          total: runningTotal,
        }
      })

      return {
        projectId: project.proyecto_id,
        name: project.nombre_proyecto,
        initialBalance,
        total,
        available,
        receiptsCount: projectReceipts.length,
        budgetCount: projectBudgets.length,
        currency: projectCurrencies[0] ?? 'CRC',
        canAggregateMoney,
        expenseHistory,
        history,
        totalHistory,
      }
    })
    .filter((project) => project.budgetCount > 0)
    .sort((left, right) => right.total - left.total)
  const chartEligibleProjects = projectHistorySeries.filter(
    (project) => project.canAggregateMoney && project.currency === 'CRC',
  )
  const excludedProjectCount = projectHistorySeries.length - chartEligibleProjects.length
  const projectHistoryPageSize = 5
  const maxProjectHistoryOffset = Math.max(chartEligibleProjects.length - projectHistoryPageSize, 0)
  const projectHistoryChartData = chartEligibleProjects.slice(
    projectHistoryOffset,
    projectHistoryOffset + projectHistoryPageSize,
  )
  const projectDonutColors = ['#22c55e', '#f97316', '#38bdf8', '#f43f5e', '#fbbf24', '#a855f7', '#14b8a6']
  const projectDonutData = activeProjects
    .map((project, index) => ({
      projectId: project.proyecto_id,
      name: project.nombre_proyecto,
      total: Number(project.presupuesto_proyecto),
      color: projectDonutColors[index % projectDonutColors.length],
    }))
    .filter((project) => project.total > 0)
    .sort((left, right) => right.total - left.total)
  const projectDonutTotal = projectDonutData.reduce((sum, project) => sum + project.total, 0)
  let donutRunningAngle = 0
  const projectDonutSegments = projectDonutData.map((project) => {
    const angle = projectDonutTotal > 0 ? (project.total / projectDonutTotal) * 360 : 0
    const startAngle = donutRunningAngle
    const endAngle = donutRunningAngle + angle
    donutRunningAngle = endAngle

    return {
      ...project,
      percent: projectDonutTotal > 0 ? (project.total / projectDonutTotal) * 100 : 0,
      path: describeDonutArc(132, 132, 104, 60, startAngle, endAngle),
    }
  })
  const costaRicaBounds = {
    minLat: 8.0,
    maxLat: 11.3,
    minLng: -85.95,
    maxLng: -82.45,
  }
  const costaRicaMapFrame = {
    left: 14,
    top: 10,
    width: 72,
    height: 82,
  }
  const costaRicaMapImageUrl = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mapa%20CR.svg'
  const projectMapMarkers = activeProjects.flatMap((project) => {
      const latitude = Number(project.latitud)
      const longitude = Number(project.longitud)

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return []
      }

      const normalizedX =
        (longitude - costaRicaBounds.minLng) / (costaRicaBounds.maxLng - costaRicaBounds.minLng)
      const normalizedY =
        (costaRicaBounds.maxLat - latitude) / (costaRicaBounds.maxLat - costaRicaBounds.minLat)
      const matchingSegment = projectDonutSegments.find((item) => item.projectId === project.proyecto_id)

      return [{
        projectId: project.proyecto_id,
        name: project.nombre_proyecto,
        xPercent: costaRicaMapFrame.left + normalizedX * costaRicaMapFrame.width,
        yPercent: costaRicaMapFrame.top + normalizedY * costaRicaMapFrame.height,
        color: matchingSegment?.color ?? '#38bdf8',
        total: Number(project.presupuesto_proyecto),
        latitud: latitude,
        longitud: longitude,
      }]
    })
  const localTransferDetails = {
    title: t('transfer.title'),
    clientName: 'EDWIN FERNANDO PEREZ ALVARADO',
    idNumber: '109860887',
    address: 'San Jose, Aserri, Centro. Urb Vista al Valle, casa 21C',
    phone: '6073-0043',
    email: 'edperez@cfia.or.cr',
    accounts: [
      {
        bank: 'DAVIVIENDA DOLARES',
        iban: 'CR44010402842616835121',
      },
      {
        bank: 'DAVIVIENDA COLONES',
        iban: 'CR94010402842616834415',
      },
    ],
    bcrAccount: {
      title: t('transfer.bcrTitle'),
      holderName: 'PEREZ ALVARADO EDWIN FERNANDO',
      idNumber: '109860887',
      iban: 'CR68015202001400187765',
      accountType: t('transfer.savingsAccount'),
      currency: t('transfer.dollars'),
    },
  }
  const selectedProject = projects.find((project) => project.proyecto_id === selectedProjectId) ?? null
  const selectedBudget = budgets.find((budget) => budget.presupuesto_id === receiptForm.presupuesto_id)
  const selectedBudgetDetails =
    budgets.find((budget) => budget.presupuesto_id === selectedBudgetId) ?? null
  const currentDashboardLabel =
    activeDashboard === 'home'
      ? t('dashboardLabels.home')
      : activeDashboard === 'accounts'
        ? t('dashboardLabels.accounts')
      : activeDashboard === 'exchange'
        ? t('dashboardLabels.exchange')
      : activeDashboard === 'users'
      ? t('dashboardLabels.users')
      : activeDashboard === 'icons'
        ? t('dashboardLabels.icons')
        : activeDashboard === 'budget-detail'
          ? t('dashboardLabels.budgetDetail')
          : budgetSectionView === 'projects'
            ? t('dashboardLabels.projects')
            : selectedProject
              ? `${t('dashboardLabels.budgets')}: ${selectedProject.nombre_proyecto}`
              : t('dashboardLabels.budgets')
  const selectedUser = users.find((user) => user.usuario_id === selectedUserId) ?? null
  const selectedReceipt =
    receipts.find((receipt) => receipt.comprobante_id === selectedReceiptId) ?? null
  const requiresExchangeRate = Boolean(
    selectedBudget && receiptForm.moneda && selectedBudget.moneda !== receiptForm.moneda,
  )
  const previewConvertedAmount =
    requiresExchangeRate && receiptForm.tipo_cambio && Number(receiptForm.monto_gasto) > 0
      ? (
          receiptForm.moneda === 'CRC' && selectedBudget?.moneda === 'USD'
            ? Number(receiptForm.monto_gasto) / Number(receiptForm.tipo_cambio)
            : Number(receiptForm.monto_gasto) * Number(receiptForm.tipo_cambio)
        ).toFixed(2)
      : null

  function compareReceiptsByDateDesc(left: Receipt, right: Receipt) {
    const leftTime = new Date(left.fecha).getTime()
    const rightTime = new Date(right.fecha).getTime()

    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime
    }

    const leftAppliedTime = left.applied_at ? new Date(left.applied_at).getTime() : Number.NaN
    const rightAppliedTime = right.applied_at ? new Date(right.applied_at).getTime() : Number.NaN

    if (!Number.isNaN(leftAppliedTime) && !Number.isNaN(rightAppliedTime) && leftAppliedTime !== rightAppliedTime) {
      return rightAppliedTime - leftAppliedTime
    }

    const leftCreatedTime = left.created_at ? new Date(left.created_at).getTime() : Number.NaN
    const rightCreatedTime = right.created_at ? new Date(right.created_at).getTime() : Number.NaN

    if (!Number.isNaN(leftCreatedTime) && !Number.isNaN(rightCreatedTime) && leftCreatedTime !== rightCreatedTime) {
      return rightCreatedTime - leftCreatedTime
    }

    if (left.fecha !== right.fecha) {
      return right.fecha.localeCompare(left.fecha)
    }

    return right.comprobante_id.localeCompare(left.comprobante_id)
  }

  function sanitizeDecimalInput(value: string) {
    const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '')
    const [integerPart = '', ...decimalParts] = normalized.split('.')

    if (decimalParts.length === 0) {
      return integerPart
    }

    return `${integerPart}.${decimalParts.join('')}`
  }

  const receiptNeedsIssuerData = receiptForm.tipo_comprobante !== 'CAJA_CHICA'

  async function loadPublicHealth() {
    const [appHealth, databaseHealth] = await Promise.all([
      request<Health>('/health'),
      request<Health>('/health/db'),
    ])
    startTransition(() => {
      setHealth(appHealth)
      setDbHealth(databaseHealth)
      setLastUpdate(new Date().toLocaleString('es-CR'))
    })
  }

  async function loadExchangeRateDashboard() {
    startTransition(() => {
      setIsExchangeRateLoading(true)
      setExchangeRateError(null)
    })

    try {
      const dashboard = await request<ExchangeRateDashboardData>('/tipo-cambio/ventanilla')
      startTransition(() => {
        setExchangeRateDashboard(dashboard)
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar el tipo de cambio del BCCR.'
      startTransition(() => {
        setExchangeRateError(message)
      })
      throw error
    } finally {
      startTransition(() => {
        setIsExchangeRateLoading(false)
      })
    }
  }

  async function loadProtectedData(activeToken: string, preferredProjectId?: string) {
    const [me, userList, projectList, budgetList, receiptList] = await Promise.all([
      request<AuthUser>('/auth/me', {}, activeToken),
      request<AuthUser[]>('/usuarios', {}, activeToken),
      request<Project[]>('/proyectos', {}, activeToken),
      request<Budget[]>('/presupuestos', {}, activeToken),
      request<Receipt[]>('/comprobantes', {}, activeToken),
    ])

    startTransition(() => {
      const preferredProjectPool =
        projectFilter === 'active'
          ? projectList.filter((project) => project.activo)
          : projectFilter === 'archived'
            ? projectList.filter((project) => !project.activo)
            : projectList
      const nextProjectId =
        preferredProjectId ||
        selectedProjectId ||
        preferredProjectPool[0]?.proyecto_id ||
        projectList.find((project) => project.activo)?.proyecto_id ||
        projectList[0]?.proyecto_id ||
        ''
      const nextBudgetId = selectedBudgetId || budgetList[0]?.presupuesto_id || ''
      const receiptsForBudget = receiptList
        .filter((receipt) => receipt.presupuesto_id === nextBudgetId)
        .sort(compareReceiptsByDateDesc)
      const nextReceiptId =
        receiptsForBudget.find((receipt) => receipt.comprobante_id === selectedReceiptId)
          ?.comprobante_id ??
        receiptsForBudget[0]?.comprobante_id ??
        ''
      setCurrentUser(me)
      setUsers(userList)
      setProjects(projectList)
      setBudgets(budgetList)
      setReceipts(receiptList)
      setSelectedProjectId(nextProjectId)
      setSelectedBudgetId(nextBudgetId)
      setSelectedReceiptId(nextReceiptId)
      setSelectedUserId((current) => current || userList[0]?.usuario_id || '')
      setLastUpdate(new Date().toLocaleString('es-CR'))
      setReceiptForm((current) => ({
        ...current,
        usuario_creador_id: me.usuario_id,
        presupuesto_id: nextBudgetId,
      }))
      setBudgetForm((current) => ({
        ...current,
        proyecto_id: current.proyecto_id || nextProjectId,
      }))
      setProjectForm((current) => ({
        ...current,
        nombre_proyecto:
          current.nombre_proyecto || projectList.find((project) => project.proyecto_id === nextProjectId)?.nombre_proyecto || '',
        fecha_inicio_proyecto:
          current.fecha_inicio_proyecto ||
          projectList.find((project) => project.proyecto_id === nextProjectId)?.fecha_inicio_proyecto ||
          new Date().toISOString().slice(0, 10),
        fecha_fin_proyecto:
          current.fecha_fin_proyecto ||
          projectList.find((project) => project.proyecto_id === nextProjectId)?.fecha_fin_proyecto ||
          '',
        latitud:
          current.latitud ||
          projectList.find((project) => project.proyecto_id === nextProjectId)?.latitud ||
          '',
        longitud:
          current.longitud ||
          projectList.find((project) => project.proyecto_id === nextProjectId)?.longitud ||
          '',
      }))
      setStatusMessage(`Sesion iniciada como ${me.nombre}.`)
    })
  }

  async function loadBudgetMovements(activeToken: string, budgetId: string) {
    if (!budgetId) {
      setMovements([])
      return
    }
    const items = await request<Movement[]>(`/presupuestos/${budgetId}/movimientos`, {}, activeToken)
    startTransition(() => setMovements(items))
  }

  async function loadReceiptAttachments(activeToken: string, receiptId: string) {
    if (!receiptId) {
      setAttachments([])
      return
    }
    const items = await request<Attachment[]>(
      `/comprobantes/${receiptId}/adjuntos`,
      {},
      activeToken,
    )
    startTransition(() => setAttachments(items))
  }

  async function refreshDashboard(activeToken = token, preferredProjectId?: string) {
    if (!activeToken) {
      return
    }

    try {
      setIsBusy(true)
      const [protectedDataResult, exchangeRateResult] = await Promise.allSettled([
        loadProtectedData(activeToken, preferredProjectId),
        loadExchangeRateDashboard(),
      ])

      if (protectedDataResult.status === 'rejected') {
        throw protectedDataResult.reason
      }

      if (exchangeRateResult.status === 'rejected') {
        setExchangeRateError(
          exchangeRateResult.reason instanceof Error
            ? exchangeRateResult.reason.message
            : 'No se pudo cargar el tipo de cambio del BCCR.',
        )
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'No se pudo cargar el panel.')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light')
    return () => {
      document.body.classList.remove('light-theme')
    }
  }, [theme])

  useEffect(() => {
    loadPublicHealth().catch(() => {
      setStatusMessage(
        'No se pudo consultar el estado del backend. Revisa que FastAPI este encendido.',
      )
    })
  }, [])

  useEffect(() => {
    if (!token) {
      return
    }

    const activeToken = token

    async function syncStoredSession() {
      try {
        setIsBusy(true)
        const [protectedDataResult, exchangeRateResult] = await Promise.allSettled([
          loadProtectedData(activeToken),
          loadExchangeRateDashboard(),
        ])

        if (protectedDataResult.status === 'rejected') {
          throw protectedDataResult.reason
        }

        if (exchangeRateResult.status === 'rejected') {
          setExchangeRateError(
            exchangeRateResult.reason instanceof Error
              ? exchangeRateResult.reason.message
              : 'No se pudo cargar el tipo de cambio del BCCR.',
          )
        }
      } catch {
        setStatusMessage('La sesion guardada ya no es valida. Inicia sesion de nuevo.')
        localStorage.removeItem('elatilo_token')
        setToken(null)
        setCurrentUser(null)
      } finally {
        setIsBusy(false)
      }
    }

    void syncStoredSession()
  }, [token])

  useEffect(() => {
    if (!token || !selectedBudgetId) {
      return
    }

    loadBudgetMovements(token, selectedBudgetId).catch((error) => {
      setStatusMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar los movimientos.',
      )
    })
  }, [token, selectedBudgetId])

  useEffect(() => {
    if (!token) {
      return
    }

    if (!selectedReceiptId) {
      setAttachments([])
      return
    }

    loadReceiptAttachments(token, selectedReceiptId).catch((error) => {
      setStatusMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar los adjuntos.',
      )
    })
  }, [token, selectedReceiptId])

  useEffect(() => {
    setProjectHistoryOffset((current) => Math.min(current, maxProjectHistoryOffset))
  }, [maxProjectHistoryOffset])

  useEffect(() => {
    if (!requiresExchangeRate && receiptForm.tipo_cambio) {
      setReceiptForm((current) => ({ ...current, tipo_cambio: '' }))
    }
  }, [requiresExchangeRate, receiptForm.tipo_cambio])

  useEffect(() => {
    if (!selectedBudgetId) {
      return
    }

    setReceiptForm((current) =>
      current.presupuesto_id === selectedBudgetId
        ? current
        : {
            ...current,
            presupuesto_id: selectedBudgetId,
          },
    )
  }, [selectedBudgetId])

  useEffect(() => {
    if (!selectedBudgetDetails) {
      return
    }

    setBudgetMaintenanceForm({
      proyecto_id: selectedBudgetDetails.proyecto_id,
      categoria: selectedBudgetDetails.categoria,
      monto_total: selectedBudgetDetails.monto_total,
      moneda: selectedBudgetDetails.moneda,
      estado: selectedBudgetDetails.estado as BudgetState,
    })
  }, [selectedBudgetDetails])

  useEffect(() => {
    if (!selectedUser) {
      return
    }

    setUserForm({
      nombre: selectedUser.nombre,
      rol: selectedUser.rol as Role,
    })
  }, [selectedUser])

  const filteredReceipts = receipts.filter((receipt) => {
    if (!deferredFilter.trim()) {
      return true
    }

    const query = deferredFilter.toLowerCase()
    return (
      receipt.negocio.toLowerCase().includes(query) ||
      receipt.descripcion.toLowerCase().includes(query) ||
      receipt.estado.toLowerCase().includes(query)
    )
  })
  const budgetReceipts = filteredReceipts
    .filter((receipt) => receipt.presupuesto_id === selectedBudgetId)
    .sort(compareReceiptsByDateDesc)
  const approvedBudgetReceipts = budgetReceipts.filter((receipt) => receipt.estado === 'APROBADO')
  const pendingBudgetReceipts = budgetReceipts.filter((receipt) => receipt.estado === 'PENDIENTE')
  const rejectedBudgetReceipts = budgetReceipts.filter((receipt) => receipt.estado === 'RECHAZADO')
  const selectedBudgetInitialBalance =
    [...movements]
      .sort((left, right) => {
        const leftTime = new Date(left.created_at).getTime()
        const rightTime = new Date(right.created_at).getTime()

        if (leftTime !== rightTime) {
          return leftTime - rightTime
        }

        return left.movimiento_id.localeCompare(right.movimiento_id)
      })[0]?.saldo_anterior ?? selectedBudgetDetails?.monto_total ?? '0'
  let selectedBudgetRunningBalance = Number(selectedBudgetInitialBalance)
  const approvedReceiptsForBalance = [...approvedBudgetReceipts].sort(
    (left, right) => compareReceiptsByDateDesc(right, left),
  )
  const receiptBalanceByDate = approvedReceiptsForBalance.reduce<Record<string, string>>(
    (balances, receipt) => {
      const amount = Number(receipt.monto_presupuesto ?? 0)

      if (Number.isNaN(amount)) {
        return balances
      }

      selectedBudgetRunningBalance =
        receipt.tipo_comprobante === 'CAJA_CHICA'
          ? selectedBudgetRunningBalance + amount
          : selectedBudgetRunningBalance - amount

      balances[receipt.comprobante_id] = selectedBudgetRunningBalance.toFixed(2)
      return balances
    },
    {},
  )
  const selectedBudgetExpenseTotal = approvedBudgetReceipts
    .filter((receipt) => receipt.tipo_comprobante !== 'CAJA_CHICA')
    .reduce((total, receipt) => total + Number(receipt.monto_presupuesto ?? 0), 0)

  function openBudgetDashboard(budgetId: string) {
    const firstReceiptId =
      receipts
        .filter((receipt) => receipt.presupuesto_id === budgetId)
        .sort(compareReceiptsByDateDesc)[0]?.comprobante_id ?? ''
    setSelectedBudgetId(budgetId)
    setSelectedReceiptId(firstReceiptId)
    setReceiptForm((current) => ({
      ...current,
      presupuesto_id: budgetId,
    }))
    setBudgetSectionView('budgets')
    setActiveDashboard('budget-detail')
  }

  function returnToBudgetsDashboard() {
    setActiveDashboard('budgets')
    setBudgetSectionView('budgets')
    setSelectedReceiptId('')
    setAttachments([])
    setReceiptFilter('')
  }

  function renderReceiptTable(
    title: string,
    receiptsSubset: Receipt[],
    emptyMessage: string,
    extraAction?: {
      label: string
      onClick: () => void
      disabled?: boolean
    },
  ) {
    return (
      <article className="card-group">
        <div className="section-title">
          <h2>{title}</h2>
          <div className="action-row">
            {extraAction ? (
              <div className="action-column">
                <button
                  className="tab-btn"
                  type="button"
                  onClick={extraAction.onClick}
                  disabled={extraAction.disabled}
                >
                  <span className="button-with-icon">
                    <MdOutlineFileDownload aria-hidden="true" />
                    <span>{extraAction.label}</span>
                  </span>
                </button>
                <ActionFeedback
                  message={actionFeedback?.target === 'export-approved' ? actionFeedback.message : null}
                  tone={actionFeedback?.tone}
                />
              </div>
            ) : null}
            <select
              className="select mini-select"
              value={selectedReceiptId}
              onChange={(event) => setSelectedReceiptId(event.target.value)}
            >
              {receiptsSubset.map((receipt) => (
                <option key={receipt.comprobante_id} value={receipt.comprobante_id}>
                  {receipt.negocio}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="excel-list-wrapper">
          <div className="excel-list-header" role="row">
            <span>Fecha</span>
            <span>Factura</span>
            <span>Negocio</span>
            <span>Tipo</span>
            <span>Monto</span>
            <span>Balance</span>
            <span>Aplicado en</span>
            <span>Estado</span>
          </div>
          <div className="excel-list-body">
            {receiptsSubset.map((receipt) => (
              <article
                className={`excel-row ${
                  selectedReceiptId === receipt.comprobante_id ? 'selected-card' : ''
                }`}
                key={receipt.comprobante_id}
                onClick={() => setSelectedReceiptId(receipt.comprobante_id)}
              >
                <span>{receipt.fecha}</span>
                <span>{receipt.numero_factura || '-'}</span>
                <span>{receipt.negocio}</span>
                <span
                  className={
                    receipt.tipo_comprobante === 'CAJA_CHICA'
                      ? 'excel-type excel-type-funding'
                      : 'excel-type excel-type-expense'
                  }
                >
                  {receipt.tipo_comprobante === 'CAJA_CHICA' ? 'Caja chica' : receipt.tipo_comprobante}
                </span>
                <span
                  className={
                    receipt.tipo_comprobante === 'CAJA_CHICA'
                      ? 'excel-amount excel-amount-funding'
                      : 'excel-amount'
                  }
                >
                  {formatMoney(receipt.monto_gasto, receipt.moneda)}
                </span>
                <span
                  className={
                    receipt.tipo_comprobante === 'CAJA_CHICA'
                      ? 'excel-balance excel-balance-up'
                      : 'excel-balance'
                  }
                >
                  {receiptBalanceByDate[receipt.comprobante_id]
                    ? formatMoney(
                        receiptBalanceByDate[receipt.comprobante_id],
                        selectedBudgetDetails?.moneda ?? receipt.moneda,
                      )
                    : 'Pendiente'}
                </span>
                <span>
                  {receipt.applied_at
                    ? new Date(receipt.applied_at).toLocaleString('es-CR')
                    : 'Sin aplicar'}
                </span>
                <span
                  className={`badge ${
                    receipt.estado === 'APROBADO'
                      ? 'approved'
                      : receipt.estado === 'RECHAZADO'
                        ? 'rejected'
                        : 'pending'
                  }`}
                >
                  {receipt.estado}
                </span>
                {receipt.monto_presupuesto ||
                receipt.observacion ||
                (canApprove && receipt.estado === 'PENDIENTE') ? (
                  <div className="excel-row-detail">
                    {receipt.monto_presupuesto ? (
                      <p className="record-conversion">
                        Monto aplicado al presupuesto:{' '}
                        {formatMoney(
                          receipt.monto_presupuesto,
                          selectedBudgetDetails?.moneda ?? receipt.moneda,
                        )}
                        {receipt.tipo_cambio
                          ? ` con tipo de cambio ${Number(receipt.tipo_cambio).toFixed(6)}`
                          : ''}
                      </p>
                    ) : null}
                    {receipt.observacion ? (
                      <p className="record-note">{receipt.observacion}</p>
                    ) : null}
                    {canApprove && receipt.estado === 'PENDIENTE' ? (
                      <div className="decision-box">
                        <input
                          className="input"
                          placeholder="Observacion opcional"
                          value={decisionNotes[receipt.comprobante_id] ?? ''}
                          onChange={(event) =>
                            setDecisionNotes((current) => ({
                              ...current,
                              [receipt.comprobante_id]: event.target.value,
                            }))
                          }
                          onClick={(event) => event.stopPropagation()}
                        />
                        <div className="action-row">
                          <div className="action-column">
                            <button
                              className="sync-btn"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleReceiptDecision(receipt.comprobante_id, 'aprobar')
                              }}
                              disabled={isBusy}
                            >
                              Aprobar
                            </button>
                            {getApprovalFeedback(receipt.observacion) ? (
                              <p className="approval-feedback">
                                <HiOutlineExclamationTriangle aria-hidden="true" />
                                <span>{getApprovalFeedback(receipt.observacion)}</span>
                              </p>
                            ) : null}
                          </div>
                          <div className="action-column">
                            <button
                              className="tab-btn"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleReceiptDecision(receipt.comprobante_id, 'rechazar')
                              }}
                              disabled={isBusy}
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                        <ActionFeedback
                          message={
                            actionFeedback?.target === `receipt-aprobar-${receipt.comprobante_id}` ||
                            actionFeedback?.target === `receipt-rechazar-${receipt.comprobante_id}`
                              ? actionFeedback.message
                              : null
                          }
                          tone={actionFeedback?.tone}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
        {receiptsSubset.length === 0 ? <p className="empty">{emptyMessage}</p> : null}
      </article>
    )
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsBusy(true)
      const response = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      })
      localStorage.setItem('elatilo_token', response.access_token)
      setToken(response.access_token)
      showActionFeedback('login', 'Sesion iniciada correctamente.')
    } catch (error) {
      showActionFeedback('login', error instanceof Error ? error.message : 'No se pudo iniciar sesion.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleBudgetCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      return
    }

    if (!budgetForm.proyecto_id) {
      showActionFeedback('budget-create', 'Selecciona un proyecto antes de crear el presupuesto.')
      return
    }

    try {
      setIsBusy(true)
      const budget = await request<Budget>(
        '/presupuestos',
        {
          method: 'POST',
          body: JSON.stringify(budgetForm),
        },
        token,
      )
      setBudgetForm((current) => ({
        ...current,
        categoria: '',
        monto_total: '0.00',
        moneda: 'CRC',
      }))
      setSelectedBudgetId(budget.presupuesto_id)
      setReceiptForm((current) => ({
        ...current,
        presupuesto_id: budget.presupuesto_id,
      }))
      showActionFeedback('budget-create', 'Presupuesto creado.')
      await refreshDashboard(token, budget.proyecto_id)
    } catch (error) {
      showActionFeedback('budget-create', error instanceof Error ? error.message : 'No se pudo crear el presupuesto.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleBudgetUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !selectedBudgetId) {
      return
    }

    try {
      setIsBusy(true)
      await request<Budget>(
        `/presupuestos/${selectedBudgetId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            proyecto_id: budgetMaintenanceForm.proyecto_id,
            categoria: budgetMaintenanceForm.categoria,
            monto_total: Number(budgetMaintenanceForm.monto_total),
            moneda: budgetMaintenanceForm.moneda,
            estado: budgetMaintenanceForm.estado,
          }),
        },
        token,
      )
      showActionFeedback('budget-update', 'Presupuesto actualizado.')
      await refreshDashboard(token, budgetMaintenanceForm.proyecto_id || selectedProjectId)
    } catch (error) {
      showActionFeedback('budget-update', error instanceof Error ? error.message : 'No se pudo actualizar el presupuesto.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleProjectCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      return
    }

    try {
      setIsBusy(true)
      const project = await request<Project>(
        '/proyectos',
        {
          method: 'POST',
          body: JSON.stringify({
            ...projectForm,
            fecha_fin_proyecto: projectForm.fecha_fin_proyecto || null,
            latitud: projectForm.latitud ? Number(projectForm.latitud) : null,
            longitud: projectForm.longitud ? Number(projectForm.longitud) : null,
          }),
        },
        token,
      )
      setProjectForm({
        nombre_proyecto: '',
        fecha_inicio_proyecto: new Date().toISOString().slice(0, 10),
        fecha_fin_proyecto: '',
        latitud: '',
        longitud: '',
      })
      setSelectedProjectId(project.proyecto_id)
      setBudgetForm((current) => ({
        ...current,
        proyecto_id: project.proyecto_id,
      }))
      showActionFeedback('project-create', 'Proyecto creado.')
      await refreshDashboard(token, project.proyecto_id)
    } catch (error) {
      showActionFeedback('project-create', error instanceof Error ? error.message : 'No se pudo crear el proyecto.')
    } finally {
      setIsBusy(false)
    }
  }

  function handleProjectSelect(projectId: string) {
    setSelectedProjectId(projectId)
    const project = projects.find((current) => current.proyecto_id === projectId)
    if (!project) {
      return
    }

    setProjectForm({
      nombre_proyecto: project.nombre_proyecto,
      fecha_inicio_proyecto: project.fecha_inicio_proyecto,
      fecha_fin_proyecto: project.fecha_fin_proyecto ?? '',
      latitud: project.latitud ?? '',
      longitud: project.longitud ?? '',
    })
    setBudgetForm((current) => ({
      ...current,
      proyecto_id: project.proyecto_id,
    }))
  }

  function openProjectBudgetsSection(projectId?: string) {
    const targetProjectId = projectId ?? selectedProjectId
    if (!targetProjectId) {
      return
    }
    if (projectId) {
      handleProjectSelect(projectId)
    }
    setBudgetForm((current) => ({ ...current, proyecto_id: targetProjectId }))
    setBudgetSectionView('budgets')
  }

  function returnToProjectsSection() {
    setBudgetSectionView('projects')
  }

  function openProjectsDashboard() {
    setActiveDashboard('budgets')
    setBudgetSectionView('projects')
  }

  function openHomeDashboard() {
    setActiveDashboard('home')
  }

  function openAccountsDashboard() {
    setActiveDashboard('accounts')
  }

  function openExchangeDashboard() {
    setActiveDashboard('exchange')
  }

  function handleProjectFilterChange(filter: 'active' | 'all' | 'archived') {
    setProjectFilter(filter)
    if (filter === 'active' && selectedProject && !selectedProject.activo) {
      setSelectedProjectId(projects.find((project) => project.activo)?.proyecto_id ?? '')
    }
    if (filter === 'archived' && selectedProject && selectedProject.activo) {
      setSelectedProjectId(projects.find((project) => !project.activo)?.proyecto_id ?? '')
    }
  }

  async function handleProjectUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !selectedProjectId) {
      return
    }

    try {
      setIsBusy(true)
      await request<Project>(
        `/proyectos/${selectedProjectId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...projectForm,
            fecha_fin_proyecto: projectForm.fecha_fin_proyecto || null,
            latitud: projectForm.latitud ? Number(projectForm.latitud) : null,
            longitud: projectForm.longitud ? Number(projectForm.longitud) : null,
          }),
        },
        token,
      )
      showActionFeedback('project-update', 'Proyecto actualizado.')
      await refreshDashboard(token)
    } catch (error) {
      showActionFeedback('project-update', error instanceof Error ? error.message : 'No se pudo actualizar el proyecto.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleProjectArchive() {
    if (!token || !selectedProjectId) {
      return
    }

    try {
      setIsBusy(true)
      await request<Project>(
        `/proyectos/${selectedProjectId}/archivar`,
        {
          method: 'PATCH',
        },
        token,
      )
      showActionFeedback('project-archive', 'Proyecto archivado.')
      await refreshDashboard(token)
    } catch (error) {
      showActionFeedback('project-archive', error instanceof Error ? error.message : 'No se pudo archivar el proyecto.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleProjectActivate() {
    if (!token || !selectedProjectId) {
      return
    }

    try {
      setIsBusy(true)
      await request<Project>(
        `/proyectos/${selectedProjectId}/activar`,
        {
          method: 'PATCH',
        },
        token,
      )
      showActionFeedback('project-activate', 'Proyecto activado.')
      await refreshDashboard(token, selectedProjectId)
    } catch (error) {
      showActionFeedback('project-activate', error instanceof Error ? error.message : 'No se pudo activar el proyecto.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleReceiptCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      return
    }

    if (
      receiptNeedsIssuerData &&
      (!receiptForm.numero_factura.trim() || !receiptForm.negocio.trim() || !receiptForm.cedula.trim())
    ) {
      showActionFeedback(
        'receipt-create',
        'Factura, Negocio y Cedula son obligatorios cuando el comprobante no es Caja chica.',
      )
      return
    }

    try {
      setIsBusy(true)
      const receipt = await request<Receipt>(
        '/comprobantes',
        {
          method: 'POST',
          body: JSON.stringify({
            ...receiptForm,
            tipo_cambio: requiresExchangeRate ? Number(receiptForm.tipo_cambio) : null,
          }),
        },
        token,
      )
      setSelectedReceiptId(receipt.comprobante_id)
      setReceiptForm((current) => ({
        ...current,
        fecha: new Date().toISOString().slice(0, 10),
        negocio: '',
        descripcion: '',
        monto_gasto: '0.00',
        tipo_cambio: '',
        numero_referencia: '',
        numero_factura: '',
        cedula: '',
        observacion: '',
      }))
      showActionFeedback('receipt-create', 'Comprobante creado.')
      setActiveDashboard('budget-detail')
      await refreshDashboard(token)
    } catch (error) {
      showActionFeedback(
        'receipt-create',
        error instanceof Error ? error.message : 'No se pudo crear el comprobante.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleReceiptDecision(receiptId: string, action: 'aprobar' | 'rechazar') {
    if (!token) {
      return
    }

    try {
      setIsBusy(true)
      await request<Receipt>(
        `/comprobantes/${receiptId}/${action}`,
        {
          method: 'POST',
          body: JSON.stringify({ observacion: decisionNotes[receiptId] || null }),
        },
        token,
      )
      showActionFeedback(
        `receipt-${action}-${receiptId}`,
        action === 'aprobar' ? 'Comprobante aprobado.' : 'Comprobante rechazado.',
      )
      await refreshDashboard(token)
    } catch (error) {
      showActionFeedback(
        `receipt-${action}-${receiptId}`,
        error instanceof Error ? error.message : 'No se pudo actualizar el comprobante.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleAttachmentCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !selectedReceiptId) {
      return
    }

    try {
      setIsAttachmentBusy(true)
      setIsBusy(true)
      await request<Attachment>(
        `/comprobantes/${selectedReceiptId}/adjuntos`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...attachmentForm,
            orden: Number(attachmentForm.orden),
          }),
        },
        token,
      )
      setAttachmentForm({
        cdn_path: '',
        nombre_archivo: '',
        tipo_archivo: '',
        orden: '1',
      })
      showActionFeedback('attachment-create', 'Adjunto agregado.')
      await loadReceiptAttachments(token, selectedReceiptId)
    } catch (error) {
      showActionFeedback('attachment-create', error instanceof Error ? error.message : 'No se pudo crear el adjunto.')
    } finally {
      setIsAttachmentBusy(false)
      setIsBusy(false)
    }
  }

  async function handleAttachmentDelete(attachmentId: string) {
    if (!token || !selectedReceiptId) {
      return
    }

    try {
      setIsAttachmentBusy(true)
      setIsBusy(true)
      await request<void>(
        `/comprobantes/${selectedReceiptId}/adjuntos/${attachmentId}`,
        { method: 'DELETE' },
        token,
      )
      showActionFeedback(`attachment-delete-${attachmentId}`, 'Adjunto eliminado.')
      await loadReceiptAttachments(token, selectedReceiptId)
    } catch (error) {
      showActionFeedback(
        `attachment-delete-${attachmentId}`,
        error instanceof Error ? error.message : 'No se pudo eliminar el adjunto.',
      )
    } finally {
      setIsAttachmentBusy(false)
      setIsBusy(false)
    }
  }

  async function handleExportApprovedReceipts() {
    if (!approvedBudgetReceipts.length || !token) {
      showActionFeedback('export-approved', 'No hay comprobantes aprobados para exportar.')
      return
    }

    try {
      setIsExportingApproved(true)
      const XLSX = await import('xlsx')
      const attachmentsByReceipt = await Promise.all(
        approvedBudgetReceipts.map(async (receipt) => {
          const receiptAttachments = await request<Attachment[]>(
            `/comprobantes/${receipt.comprobante_id}/adjuntos`,
            {},
            token,
          )

          return [receipt.comprobante_id, receiptAttachments] as const
        }),
      )
      const attachmentsMap = new Map(attachmentsByReceipt)
      const budgetCurrency = selectedBudgetDetails?.moneda ?? 'CRC'
      const rows = approvedBudgetReceipts.map((receipt) => ({
        Fecha: receipt.fecha,
        Factura: receipt.numero_factura ?? '',
        Negocio: receipt.negocio,
        Cedula: receipt.cedula ?? '',
        Descripcion: receipt.descripcion,
        Tipo: receipt.tipo_comprobante,
        Categoria: receipt.tipo_comprobante === 'CAJA_CHICA' ? 'Caja chica' : 'Gasto',
        Moneda: receipt.moneda,
        'Monto del gasto':
          receipt.tipo_comprobante === 'CAJA_CHICA'
            ? ''
            : formatMoney(receipt.monto_gasto, receipt.moneda),
        'Monto presupuesto':
          receipt.tipo_comprobante === 'CAJA_CHICA' && receipt.monto_presupuesto
            ? formatMoney(receipt.monto_presupuesto, budgetCurrency)
            : '',
        Balance: receipt.balance ? Number(receipt.balance) : '',
        Estado: receipt.estado,
        Observacion: receipt.observacion ?? '',
        'Paths adjuntos': (attachmentsMap.get(receipt.comprobante_id) ?? [])
          .map((attachment) => attachment.cdn_path)
          .join(' | '),
      }))
      const worksheet = XLSX.utils.json_to_sheet(rows)
      const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1')
      const headerRow = 0
      let tipoColumn = -1
      let categoriaColumn = -1
      let montoColumn = -1
      let montoPresupuestoColumn = -1
      let balanceColumn = -1

      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col })
        const cellValue = worksheet[cellAddress]?.v

        if (cellValue === 'Tipo') {
          tipoColumn = col
        } else if (cellValue === 'Categoria') {
          categoriaColumn = col
        } else if (cellValue === 'Monto del gasto') {
          montoColumn = col
        } else if (cellValue === 'Monto presupuesto') {
          montoPresupuestoColumn = col
        } else if (cellValue === 'Balance') {
          balanceColumn = col
        }
      }

      const greenStyle = {
        font: { color: { rgb: '15803D' }, bold: true },
        fill: { fgColor: { rgb: 'DCFCE7' } },
      }
      const redStyle = {
        font: { color: { rgb: 'B91C1C' }, bold: true },
        fill: { fgColor: { rgb: 'FEE2E2' } },
      }

      for (let row = 1; row <= range.e.r; row += 1) {
        const tipoCellAddress = XLSX.utils.encode_cell({ r: row, c: tipoColumn })
        const tipoValue = worksheet[tipoCellAddress]?.v

        if (tipoValue === 'CAJA_CHICA') {
          ;[tipoColumn, categoriaColumn, montoPresupuestoColumn, balanceColumn].forEach((column) => {
            if (column < 0) {
              return
            }

            const cellAddress = XLSX.utils.encode_cell({ r: row, c: column })
            if (worksheet[cellAddress]) {
              worksheet[cellAddress].s = greenStyle
            }
          })
        } else {
          ;[montoColumn, balanceColumn].forEach((column) => {
            if (column < 0) {
              return
            }

            const cellAddress = XLSX.utils.encode_cell({ r: row, c: column })
            if (worksheet[cellAddress]) {
              worksheet[cellAddress].s = redStyle
            }
          })
        }
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ComprobantesAprobados')
      const budgetName =
        selectedBudgetDetails?.categoria.trim().replace(/[^\w-]+/g, '_') || 'presupuesto'
      XLSX.writeFile(workbook, `comprobantes_aprobados_${budgetName}.xlsx`)
      showActionFeedback('export-approved', 'Comprobantes aprobados exportados a Excel.')
    } catch (error) {
      showActionFeedback(
        'export-approved',
        error instanceof Error ? error.message : 'No se pudieron exportar los comprobantes.',
      )
    } finally {
      setIsExportingApproved(false)
    }
  }

  async function handleUserUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !selectedUserId) {
      return
    }

    try {
      setIsBusy(true)
      await request<AuthUser>(
        `/usuarios/${selectedUserId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(userForm),
        },
        token,
      )
      showActionFeedback('user-update', 'Usuario actualizado.')
      await refreshDashboard(token)
    } catch (error) {
      showActionFeedback('user-update', error instanceof Error ? error.message : 'No se pudo actualizar el usuario.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleUserCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setIsBusy(true)
      const response = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(createUserForm),
      })
      setCreateUserForm({
        nombre: '',
        email: '',
        password: '',
        rol: 'REGISTRADOR',
      })
      setSelectedUserId(response.user.usuario_id)
      showActionFeedback('user-create', 'Usuario creado.')
      if (token) {
        await refreshDashboard(token)
      }
    } catch (error) {
      showActionFeedback('user-create', error instanceof Error ? error.message : 'No se pudo crear el usuario.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleUserToggleActive(nextActive: boolean) {
    if (!token || !selectedUserId) {
      return
    }

    try {
      setIsBusy(true)
      await request<AuthUser>(
        `/usuarios/${selectedUserId}/${nextActive ? 'activar' : 'desactivar'}`,
        { method: 'PATCH' },
        token,
      )
      showActionFeedback(
        nextActive ? 'user-activate' : 'user-deactivate',
        nextActive ? 'Usuario activado.' : 'Usuario deshabilitado.',
      )
      await refreshDashboard(token)
    } catch (error) {
      showActionFeedback(
        nextActive ? 'user-activate' : 'user-deactivate',
        error instanceof Error ? error.message : 'No se pudo cambiar el estado del usuario.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('elatilo_token')
    setToken(null)
    setCurrentUser(null)
    setUsers([])
    setBudgets([])
    setReceipts([])
    setMovements([])
    setAttachments([])
    setSelectedBudgetId('')
    setSelectedReceiptId('')
    showActionFeedback('logout', 'Sesion cerrada.')
  }

  const currentThemeLabel = theme === 'dark' ? t('theme.light') : t('theme.dark')
  const currentHealthClass = health?.status === 'ok' ? 'ok' : 'unknown'
  const currentDbClass = dbHealth?.status === 'ok' ? 'ok' : 'unknown'
  const isAuthenticated = Boolean(token && currentUser)
  const canApprove = currentUser?.rol === 'ADMIN' || currentUser?.rol === 'APROBADOR'
  const statusTone = getStatusTone(statusMessage)
  const selectedBudgetTotal = Number(selectedBudgetDetails?.monto_total ?? 0)
  const selectedBudgetAvailable =
    movements.length > 0
      ? Number(
          [...movements].sort((left, right) => {
            const leftTime = new Date(left.created_at).getTime()
            const rightTime = new Date(right.created_at).getTime()

            if (leftTime !== rightTime) {
              return rightTime - leftTime
            }

            return right.movimiento_id.localeCompare(left.movimiento_id)
          })[0]?.saldo_nuevo ?? selectedBudgetDetails?.saldo_disponible ?? 0,
        )
      : approvedReceiptsForBalance.length > 0
        ? Number(
            receiptBalanceByDate[
              approvedReceiptsForBalance[approvedReceiptsForBalance.length - 1].comprobante_id
            ] ?? selectedBudgetDetails?.saldo_disponible ?? 0,
          )
        : Number(selectedBudgetDetails?.saldo_disponible ?? selectedBudgetInitialBalance)
  const selectedBudgetConsumed = Math.max(selectedBudgetTotal - selectedBudgetAvailable, 0)
  const selectedBudgetAvailablePercent =
    selectedBudgetTotal > 0 ? (selectedBudgetAvailable / selectedBudgetTotal) * 100 : 0
  const selectedBudgetConsumedPercent =
    selectedBudgetTotal > 0 ? (selectedBudgetConsumed / selectedBudgetTotal) * 100 : 0
  const selectedBudgetIsClosed = selectedBudgetDetails?.estado === 'CERRADO'
  const projectHistoryChartWidth = 880
  const projectHistoryChartHeight = 320
  const projectHistoryChartPadding = { top: 18, right: 24, bottom: 44, left: 54 }
  const projectHistoryChartInnerWidth =
    projectHistoryChartWidth - projectHistoryChartPadding.left - projectHistoryChartPadding.right
  const projectHistoryChartInnerHeight =
    projectHistoryChartHeight - projectHistoryChartPadding.top - projectHistoryChartPadding.bottom
  const projectHistoryColors = ['#22c55e', '#f97316', '#38bdf8', '#f43f5e', '#fbbf24']
  const historyDateLabels = Array.from(
    new Set(projectHistoryChartData.flatMap((project) => project.history.map((point) => point.date))),
  ).sort((left, right) => left.localeCompare(right))
  const projectHistoryDomain = historyDateLabels.length
    ? historyDateLabels
    : [new Date().toISOString().slice(0, 10)]
  const projectHistoryMaxValue = Math.max(
    ...projectHistoryChartData.flatMap((project) => [
      project.initialBalance,
      ...project.history.map((point) => point.balance),
      ...project.totalHistory.map((point) => point.total),
      ...project.expenseHistory.map((receipt) => Number(receipt.monto_presupuesto ?? 0)),
    ]),
    1,
  )
  const projectHistorySeriesPaths = projectHistoryChartData.map((project, projectIndex) => {
    let currentBalance = project.initialBalance
    const balanceByDate = new Map(project.history.map((point) => [point.date, point.balance]))
    const points = projectHistoryDomain.map((date, index) => {
      if (balanceByDate.has(date)) {
        currentBalance = balanceByDate.get(date) ?? currentBalance
      }

      const x =
        projectHistoryChartPadding.left +
        (projectHistoryDomain.length === 1
          ? projectHistoryChartInnerWidth / 2
          : (projectHistoryChartInnerWidth / Math.max(projectHistoryDomain.length - 1, 1)) * index)
      const y =
        projectHistoryChartPadding.top +
        projectHistoryChartInnerHeight -
        (currentBalance / projectHistoryMaxValue) * projectHistoryChartInnerHeight

      return { x, y, value: currentBalance, date }
    })

    return {
      ...project,
      color: projectHistoryColors[projectIndex % projectHistoryColors.length],
      points,
      path: buildLinePath(points),
    }
  })
  const projectExpenseSeriesPaths = projectHistoryChartData.map((project, projectIndex) => {
    let runningExpenses = 0
    const groupedExpenses = project.expenseHistory.reduce<Record<string, number>>((accumulator, receipt) => {
      accumulator[receipt.fecha] = (accumulator[receipt.fecha] ?? 0) + Number(receipt.monto_presupuesto ?? 0)
      return accumulator
    }, {})
    const points = projectHistoryDomain.map((date, index) => {
      if (groupedExpenses[date]) {
        runningExpenses += groupedExpenses[date]
      }

      const x =
        projectHistoryChartPadding.left +
        (projectHistoryDomain.length === 1
          ? projectHistoryChartInnerWidth / 2
          : (projectHistoryChartInnerWidth / Math.max(projectHistoryDomain.length - 1, 1)) * index)
      const y =
        projectHistoryChartPadding.top +
        projectHistoryChartInnerHeight -
        (runningExpenses / projectHistoryMaxValue) * projectHistoryChartInnerHeight

      return { x, y, value: runningExpenses, date }
    })

    return {
      ...project,
      color: projectHistoryColors[projectIndex % projectHistoryColors.length],
      points,
      path: buildLinePath(points),
      totalExpenses: runningExpenses,
    }
  })
  const projectTotalSeriesPaths = projectHistoryChartData.map((project, projectIndex) => {
    let currentTotal = project.initialBalance
    const totalByDate = new Map(project.totalHistory.map((point) => [point.date, point.total]))
    const points = projectHistoryDomain.map((date, index) => {
      if (totalByDate.has(date)) {
        currentTotal = totalByDate.get(date) ?? currentTotal
      }

      const x =
        projectHistoryChartPadding.left +
        (projectHistoryDomain.length === 1
          ? projectHistoryChartInnerWidth / 2
          : (projectHistoryChartInnerWidth / Math.max(projectHistoryDomain.length - 1, 1)) * index)
      const y =
        projectHistoryChartPadding.top +
        projectHistoryChartInnerHeight -
        (currentTotal / projectHistoryMaxValue) * projectHistoryChartInnerHeight

      return { x, y, value: currentTotal, date }
    })

    return {
      ...project,
      color: projectHistoryColors[projectIndex % projectHistoryColors.length],
      points,
      path: buildLinePath(points),
    }
  })
  const visibleProjectHistorySeriesPaths = projectHistorySeriesPaths.filter(
    (project) => !hiddenProjectHistoryIds.includes(project.projectId),
  )
  const visibleProjectExpenseSeriesPaths = projectExpenseSeriesPaths.filter(
    (project) => !hiddenProjectHistoryIds.includes(project.projectId),
  )
  const visibleProjectTotalSeriesPaths = projectTotalSeriesPaths.filter(
    (project) => !hiddenProjectHistoryIds.includes(project.projectId),
  )

  function showActionFeedback(target: string, message: string) {
    const tone = getStatusTone(message)
    setStatusMessage(message)
    setActionFeedback({ target, message, tone })
  }

  async function handleCopyBudgetId() {
    const budgetId = selectedBudgetDetails?.presupuesto_id

    if (!budgetId) {
      showActionFeedback('budget-id-copy', 'No hay ID de presupuesto para copiar.')
      return
    }

    try {
      await navigator.clipboard.writeText(budgetId)
      showActionFeedback('budget-id-copy', 'ID del presupuesto copiado.')
    } catch (error) {
      showActionFeedback(
        'budget-id-copy',
        error instanceof Error ? error.message : 'No se pudo copiar el ID del presupuesto.',
      )
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="login-shell">
        <img className="login-logo-corner" src="/logo1.jpeg" alt="Elatilo" />
        <section className="login-screen">
          <div className="login-copy">
            <p className="muted">{t('auth.eyebrow')}</p>
            <h1>{t('auth.loginRequired')}</h1>
            <p className={`sync-status ${statusTone}`}>{statusMessage}</p>

            <div className="health-layout">
              <article className="health-card">
                <h3>{t('auth.api')}</h3>
                <p className="health-row">
                  {t('auth.status')}:{' '}
                  <span className={`health-badge ${currentHealthClass}`}>
                    {health?.status ?? 'unknown'}
                  </span>
                </p>
                <p className="health-meta">{health?.app ?? t('auth.noResponse')}</p>
              </article>
              <article className="health-card">
                <h3>{t('auth.localDb')}</h3>
                <p className="health-row">
                  {t('auth.status')}:{' '}
                  <span className={`health-badge ${currentDbClass}`}>
                    {dbHealth?.status ?? 'unknown'}
                  </span>
                </p>
                <p className="health-meta">{dbHealth?.database ?? t('auth.pending')}</p>
              </article>
            </div>
          </div>

          <div className="login-card">
            <div className="header-top">
              <div>
                <h2>{t('auth.loginTitle')}</h2>
                <p className="muted">{t('auth.connectApi')}</p>
              </div>
              <div className="sync-wrap">
                <button className="theme-btn" type="button" onClick={toggleLanguage}>
                  {t('language.switchTo')}
                </button>
                <button
                  className="theme-btn"
                  type="button"
                  onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                >
                  {currentThemeLabel}
                </button>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleLogin}>
              <label className="field">
                <span>{t('auth.email')}</span>
                <input
                  className="input"
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>{t('auth.password')}</span>
                <input
                  className="input"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <button className="sync-btn" type="submit" disabled={isBusy}>
                {isBusy ? t('auth.loginBusy') : t('auth.loginAction')}
              </button>
              <ActionFeedback
                message={actionFeedback?.target === 'login' ? actionFeedback.message : null}
                tone={actionFeedback?.tone}
              />
            </form>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="container">
      <img className="dashboard-logo-corner" src="/logo1.jpeg" alt="Elatilo" />
      <a className="skip-link" href="#main-panel">
        {t('app.skipToPanel')}
      </a>

      <header>
        <div className="header-top">
          <div>
            <h1>{t('app.title')}</h1>
            <p className="dashboard-location-label">{currentDashboardLabel}</p>
            <p className="muted">{t('app.subtitle')}</p>
          </div>
          <div className="sync-wrap">
            <button className="theme-btn" type="button" onClick={toggleLanguage}>
              {t('language.switchTo')}
            </button>
            <button
              className="theme-btn"
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {currentThemeLabel}
            </button>
            <button
              className="sync-btn"
              type="button"
              onClick={() => refreshDashboard()}
              disabled={!token || isBusy}
            >
              {t('menu.sync')}
            </button>
            <div className={`sync-loader ${isBusy ? 'active' : ''}`} aria-hidden="true">
              <span className="loader-dot" />
              <span className="loader-dot" />
              <span className="loader-dot" />
            </div>
          </div>
        </div>
        <p id="lastUpdate">{t('app.lastUpdate')}: {lastUpdate}</p>
        <p className={`sync-status ${statusTone}`}>{statusMessage}</p>
      </header>

      <section className="card-group" id="main-panel">
        <div className="tabs-row">
          <div className="tabs">
            <button
              className={`tab-btn dashboard-home-btn ${activeDashboard === 'home' ? 'active' : ''}`}
              type="button"
              onClick={openHomeDashboard}
            >
              <span className="button-with-icon">
                <HiOutlineChartBar aria-hidden="true" />
                <span>{t('menu.dashboard')}</span>
              </span>
            </button>
            <button
              className={`tab-btn ${activeDashboard === 'budgets' || activeDashboard === 'budget-detail' ? 'active' : ''}`}
              type="button"
              onClick={openProjectsDashboard}
            >
              <span className="button-with-icon">
                <IoBusinessOutline aria-hidden="true" />
                <span>{t('menu.projects')}</span>
              </span>
            </button>
            <button
              className={`tab-btn ${activeDashboard === 'users' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveDashboard('users')}
            >
              <span className="button-with-icon">
                <HiOutlineUsers aria-hidden="true" />
                <span>{t('menu.users')}</span>
              </span>
            </button>
            <button
              className={`tab-btn ${activeDashboard === 'icons' ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveDashboard('icons')}
            >
              <span className="button-with-icon">
                <HiOutlineFolderOpen aria-hidden="true" />
                <span>{t('menu.icons')}</span>
              </span>
            </button>
            <button
              className={`tab-btn ${activeDashboard === 'accounts' ? 'active' : ''}`}
              type="button"
              onClick={openAccountsDashboard}
            >
              <span className="button-with-icon">
                <MdOutlinePayments aria-hidden="true" />
                <span>{t('menu.accounts')}</span>
              </span>
            </button>
            <button
              className={`tab-btn ${activeDashboard === 'exchange' ? 'active' : ''}`}
              type="button"
              onClick={openExchangeDashboard}
            >
              <span className="button-with-icon">
                <HiOutlineDocumentText aria-hidden="true" />
                <span>{t('menu.exchange')}</span>
              </span>
            </button>
          </div>
          <div className="action-row">
            {activeDashboard === 'budget-detail' ? (
              <button className="tab-btn sort-order-btn" type="button" onClick={returnToBudgetsDashboard}>
                {t('menu.backToBudgets')}
              </button>
            ) : null}
            <span className="badge role">
              <span className="button-with-icon">
                <HiOutlineAcademicCap aria-hidden="true" />
                <span>{currentUser?.rol}</span>
              </span>
            </span>
            <div className="action-column">
              <button className="tab-btn sort-order-btn" type="button" onClick={handleLogout}>
                {t('menu.logout')}
              </button>
              <ActionFeedback
                message={actionFeedback?.target === 'logout' ? actionFeedback.message : null}
                tone={actionFeedback?.tone}
              />
            </div>
          </div>
        </div>

        {activeDashboard === 'home' ||
        activeDashboard === 'budgets' ||
        activeDashboard === 'budget-detail' ||
        activeDashboard === 'accounts' ||
        activeDashboard === 'exchange' ? null : (
          <div className="health-layout">
            <article className="health-card">
              <h3>
                {activeDashboard === 'users'
                  ? 'Resumen de usuarios'
                  : activeDashboard === 'icons'
                    ? 'Galeria de iconos'
                    : 'Presupuesto activo'}
              </h3>
              {activeDashboard === 'users' ? (
                <>
                  <p className="health-row">
                    Usuarios: <span className={`health-badge ${currentHealthClass}`}>{users.length}</span>
                  </p>
                  <p className="health-row">
                    Activos:{' '}
                    <span className="health-badge ok">
                      {users.filter((user) => user.activo).length}
                    </span>
                  </p>
                  <p className="health-meta">
                    Inactivos: {users.filter((user) => !user.activo).length}
                  </p>
                </>
              ) : activeDashboard === 'icons' ? (
                <>
                  <p className="health-row">React Icons</p>
                  <p className="health-meta">Explora familias visuales para futuros dashboards.</p>
                  <p className="health-meta">Incluye Heroicons, Feather, Font Awesome, Material y mas.</p>
                </>
              ) : (
                <>
                  <p className="health-row">
                    Nombre del presupuesto:{' '}
                    <span className="budget-name-highlight">
                      {selectedBudgetDetails?.categoria ?? 'Sin presupuesto'}
                    </span>
                  </p>
                  <p className="health-meta budget-id-row">
                    ID del presupuesto:{' '}
                    <span className="budget-id-highlight">
                      {selectedBudgetDetails?.presupuesto_id ?? 'N/D'}
                    </span>
                    <button className="tab-btn budget-copy-btn" type="button" onClick={handleCopyBudgetId}>
                      <span className="button-with-icon">
                        <MdContentCopy aria-hidden="true" />
                        <span>Copy</span>
                      </span>
                    </button>
                  </p>
                  <p className="health-meta">
                    Saldo inicial:{' '}
                    {selectedBudgetDetails
                      ? formatMoney(
                          Number(selectedBudgetInitialBalance).toFixed(2),
                          selectedBudgetDetails.moneda,
                        )
                      : 'N/D'}
                  </p>
                  <p className="health-meta">
                    Saldo total:{' '}
                    {selectedBudgetDetails
                      ? formatMoney(
                          Number(selectedBudgetTotal).toFixed(2),
                          selectedBudgetDetails.moneda,
                        )
                      : 'N/D'}
                  </p>
                  <p className="health-meta">
                    Total de gastos:{' '}
                    {selectedBudgetDetails
                      ? formatMoney(
                          Number(selectedBudgetExpenseTotal).toFixed(2),
                          selectedBudgetDetails.moneda,
                        )
                      : 'N/D'}
                  </p>
                  <p className="health-meta">
                    Disponible:{' '}
                    {selectedBudgetDetails
                      ? formatMoney(
                          Number(selectedBudgetAvailable).toFixed(2),
                          selectedBudgetDetails.moneda,
                        )
                      : 'N/D'}
                  </p>
                  <p className="health-meta">
                    Moneda: {selectedBudgetDetails?.moneda ?? 'N/D'}
                  </p>
                  <div className="budget-bar-group budget-bar-group-compact">
                    <div className="budget-bar-labels">
                      <span>Consumido {selectedBudgetConsumedPercent.toFixed(1)}%</span>
                      <span>Disponible {selectedBudgetAvailablePercent.toFixed(1)}%</span>
                    </div>
                    <div className="budget-bar-track" aria-hidden="true">
                      <div
                        className={`budget-bar-fill ${selectedBudgetIsClosed ? 'budget-bar-closed' : 'budget-bar-consumed'}`}
                        style={{ width: `${Math.min(selectedBudgetConsumedPercent, 100)}%` }}
                      />
                      <div
                        className={`budget-bar-fill ${selectedBudgetIsClosed ? 'budget-bar-closed' : 'budget-bar-available'}`}
                        style={{ width: `${Math.min(selectedBudgetAvailablePercent, 100)}%` }}
                      />
                    </div>
                    <p className="budget-plot-note">
                      Porcentajes del plot redondeados a 1 decimal.
                    </p>
                  </div>
                </>
              )}
            </article>

            <article className="health-card">
              <h3>{activeDashboard === 'users' ? 'Mantenimientos' : activeDashboard === 'icons' ? 'Uso sugerido' : 'Estado del entorno'}</h3>
              {activeDashboard === 'users' ? (
                <>
                  <p className="health-row">Actualizar perfil y rol</p>
                  <p className="health-meta">Activar o deshabilitar usuarios desde esta vista.</p>
                  <p className="health-meta">
                    Cambio de password pendiente de endpoint en backend.
                  </p>
                </>
              ) : activeDashboard === 'icons' ? (
                <>
                  <p className="health-row">Seleccion visual, no exhaustiva</p>
                  <p className="health-meta">Evita cargar literalmente miles de iconos en la app.</p>
                  <p className="health-meta">Sirve para escoger un estilo antes de implementarlo.</p>
                </>
              ) : (
                <>
                  <p className="health-row">
                    API:{' '}
                    <span className={`health-badge ${currentHealthClass}`}>
                      {health?.status ?? 'unknown'}
                    </span>
                  </p>
                  <p className="health-row">
                    DB:{' '}
                    <span className={`health-badge ${currentDbClass}`}>
                      {dbHealth?.status ?? 'unknown'}
                    </span>
                  </p>
                  <p className="health-meta">
                    Comprobantes del presupuesto: {budgetReceipts.length}
                  </p>
                </>
              )}
            </article>
          </div>
        )}

      </section>

      {activeDashboard === 'budget-detail' ? (
        <article className="card-group detail-summary-card">
          <h2>Resumen Presupuesto</h2>
          <p className="health-row">
            Nombre del presupuesto:{' '}
            <span className="budget-name-highlight">
              {selectedBudgetDetails?.categoria ?? 'Sin presupuesto'}
            </span>
          </p>
          <p className="health-meta budget-id-row">
            ID del presupuesto:{' '}
            <span className="budget-id-highlight">
              {selectedBudgetDetails?.presupuesto_id ?? 'N/D'}
            </span>
            <button className="tab-btn budget-copy-btn" type="button" onClick={handleCopyBudgetId}>
              <span className="button-with-icon">
                <MdContentCopy aria-hidden="true" />
                <span>Copy</span>
              </span>
            </button>
          </p>
          <p className="health-meta">
            Saldo inicial:{' '}
            {selectedBudgetDetails
              ? formatMoney(
                  Number(selectedBudgetInitialBalance).toFixed(2),
                  selectedBudgetDetails.moneda,
                )
              : 'N/D'}
          </p>
          <p className="health-meta">
            Saldo total:{' '}
            {selectedBudgetDetails
              ? formatMoney(
                  Number(selectedBudgetTotal).toFixed(2),
                  selectedBudgetDetails.moneda,
                )
              : 'N/D'}
          </p>
          <p className="health-meta">
            Total de gastos:{' '}
            {selectedBudgetDetails
              ? formatMoney(
                  Number(selectedBudgetExpenseTotal).toFixed(2),
                  selectedBudgetDetails.moneda,
                )
              : 'N/D'}
          </p>
          <p className="health-meta">
            Disponible:{' '}
            {selectedBudgetDetails
              ? formatMoney(
                  Number(selectedBudgetAvailable).toFixed(2),
                  selectedBudgetDetails.moneda,
                )
              : 'N/D'}
          </p>
          <p className="health-meta">
            Moneda: {selectedBudgetDetails?.moneda ?? 'N/D'}
          </p>
          <div className="budget-bar-group budget-bar-group-compact">
            <div className="budget-bar-labels">
              <span>Consumido {selectedBudgetConsumedPercent.toFixed(1)}%</span>
              <span>Disponible {selectedBudgetAvailablePercent.toFixed(1)}%</span>
            </div>
            <div className="budget-bar-track" aria-hidden="true">
               <div
                className={`budget-bar-fill ${selectedBudgetIsClosed ? 'budget-bar-closed' : 'budget-bar-consumed'}`}
                style={{ width: `${Math.min(selectedBudgetConsumedPercent, 100)}%` }}
              />
              <div
                className={`budget-bar-fill ${selectedBudgetIsClosed ? 'budget-bar-closed' : 'budget-bar-available'}`}
                style={{ width: `${Math.min(selectedBudgetAvailablePercent, 100)}%` }}
              />
            </div>
            <p className="budget-plot-note">
              Porcentajes del plot redondeados a 1 decimal.
            </p>
          </div>
        </article>
      ) : null}

      <section className="dashboard-layout">
        <div id="dashboard-content">
          {activeDashboard === 'home' ? (
            <section className="panel-stack">
              <div className="status-grid dashboard-summary-grid">
                <article className="card dashboard-summary-card summary-projects">
                  <div className="dashboard-summary-head">
                    <div className="dashboard-summary-icon">
                      <IoBusinessOutline aria-hidden="true" />
                    </div>
                    <div className="dashboard-summary-copy">
                      <p className="dashboard-summary-label">{t('summary.activeProjects')}</p>
                      <p className="big">{activeProjects.length}</p>
                    </div>
                  </div>
                  <p className="dashboard-summary-meta">{t('summary.activeProjectsMeta')}</p>
                </article>

                <article className="card dashboard-summary-card summary-budgets">
                  <div className="dashboard-summary-head">
                    <div className="dashboard-summary-icon">
                      <MdOutlinePayments aria-hidden="true" />
                    </div>
                    <div className="dashboard-summary-copy">
                      <p className="dashboard-summary-label">{t('summary.activeBudgets')}</p>
                      <p className="big">{activeBudgets.length}</p>
                    </div>
                  </div>
                  <p className="dashboard-summary-meta">{activeBudgetsTotalLabel}</p>
                </article>

                <article className="card dashboard-summary-card summary-receipts">
                  <div className="dashboard-summary-head">
                    <div className="dashboard-summary-icon">
                      <HiOutlineDocumentText aria-hidden="true" />
                    </div>
                    <div className="dashboard-summary-copy">
                      <p className="dashboard-summary-label">{t('summary.receipts')}</p>
                      <p className="big">{nonRejectedReceipts.length}</p>
                    </div>
                  </div>
                  <p className="dashboard-summary-meta">{receiptsTotalLabel}</p>
                </article>

                <article className="card dashboard-summary-card summary-cashbox">
                  <div className="dashboard-summary-head">
                    <div className="dashboard-summary-icon">
                      <HiOutlineChartBar aria-hidden="true" />
                    </div>
                    <div className="dashboard-summary-copy">
                      <p className="dashboard-summary-label">{t('summary.cashboxReceipts')}</p>
                      <p className="big">{cashboxReceipts.length}</p>
                    </div>
                  </div>
                  <p className="dashboard-summary-meta">{cashboxTotalLabel}</p>
                </article>
              </div>

              <article className="card project-density-card">
                <div className="section-title">
                  <div>
                    <h2>Historial de saldo por proyectos</h2>
                    <p className="muted">
                      Eje X por fecha y eje Y por saldo acumulado del proyecto.
                    </p>
                  </div>
                  <div className="action-row">
                    <button
                      className="tab-btn sort-order-btn"
                      type="button"
                      onClick={() =>
                        setProjectHistoryOffset((current) => Math.max(current - projectHistoryPageSize, 0))
                      }
                      disabled={projectHistoryOffset === 0}
                    >
                      Proyecto anterior
                    </button>
                    <button
                      className="tab-btn sort-order-btn"
                      type="button"
                      onClick={() =>
                        setProjectHistoryOffset((current) =>
                          Math.min(current + projectHistoryPageSize, maxProjectHistoryOffset),
                        )
                      }
                      disabled={projectHistoryOffset >= maxProjectHistoryOffset}
                    >
                      Proyecto siguiente
                    </button>
                  </div>
                </div>

                {projectHistoryChartData.length ? (
                  <div className="project-area-chart-shell">
                    <div className="project-area-chart-header">
                      {projectHistorySeriesPaths.map((project) => (
                        <button
                          key={project.projectId}
                          className={`project-area-chart-badge project-line-badge ${
                            hiddenProjectHistoryIds.includes(project.projectId) ? 'is-muted' : ''
                          }`}
                          type="button"
                          onClick={() =>
                            setHiddenProjectHistoryIds((current) =>
                              current.includes(project.projectId)
                                ? current.filter((id) => id !== project.projectId)
                                : [...current, project.projectId],
                            )
                          }
                          style={{ borderColor: project.color, color: project.color }}
                        >
                          {project.name}
                        </button>
                      ))}
                      <span className="project-area-chart-badge project-expense-badge">
                        Gastos acumulados
                      </span>
                      <span className="project-area-chart-badge project-total-badge">
                        Saldo total
                      </span>
                    </div>

                    <svg
                      className="project-area-chart"
                      viewBox={`0 0 ${projectHistoryChartWidth} ${projectHistoryChartHeight}`}
                      role="img"
                      aria-label="Historial de saldo por proyectos"
                    >
                      {[0, 1, 2, 3, 4].map((step) => {
                        const y =
                          projectHistoryChartPadding.top + (projectHistoryChartInnerHeight / 4) * step
                        const value = ((projectHistoryMaxValue * (4 - step)) / 4).toFixed(0)

                        return (
                          <g key={step}>
                            <line
                              className="project-area-grid-line"
                              x1={projectHistoryChartPadding.left}
                              y1={y}
                              x2={projectHistoryChartWidth - projectHistoryChartPadding.right}
                              y2={y}
                            />
                            <text
                              className="project-area-axis-label"
                              x={projectHistoryChartPadding.left - 10}
                              y={y + 4}
                            >
                              {value}
                            </text>
                          </g>
                        )
                      })}

                      {visibleProjectHistorySeriesPaths.map((project) => (
                        <g key={project.projectId}>
                          <path
                            className="project-history-line"
                            d={project.path}
                            style={{ stroke: project.color }}
                          />
                          {project.points.map((point, pointIndex) => (
                            <circle
                              key={`${project.projectId}-${point.date}`}
                              className="project-history-point"
                              cx={point.x}
                              cy={point.y}
                              r="3.5"
                              style={{
                                fill: project.color,
                                animationDelay: `${0.18 + pointIndex * 0.06}s`,
                              }}
                            />
                          ))}
                        </g>
                      ))}
                      {visibleProjectTotalSeriesPaths.map((project) => (
                        <g key={`${project.projectId}-total`}>
                          <path
                            className="project-total-line"
                            d={project.path}
                            style={{ stroke: '#fbbf24' }}
                          />
                          {project.points.map((point, pointIndex) => (
                            <circle
                              key={`${project.projectId}-total-${point.date}`}
                              className="project-total-point"
                              cx={point.x}
                              cy={point.y}
                              r="2.6"
                              style={{
                                fill: '#fbbf24',
                                animationDelay: `${0.24 + pointIndex * 0.06}s`,
                              }}
                            />
                          ))}
                        </g>
                      ))}
                      {visibleProjectExpenseSeriesPaths.map((project) => (
                        <g key={`${project.projectId}-expenses`}>
                          <path
                            className="project-expense-line"
                            d={project.path}
                            style={{ stroke: '#ef4444' }}
                          />
                          {project.points.map((point, pointIndex) => (
                            <circle
                              key={`${project.projectId}-expense-${point.date}`}
                              className="project-expense-point"
                              cx={point.x}
                              cy={point.y}
                              r="2.6"
                              style={{
                                fill: '#ef4444',
                                animationDelay: `${0.28 + pointIndex * 0.06}s`,
                              }}
                            />
                          ))}
                        </g>
                      ))}

                      {projectHistoryDomain.map((date, index) => {
                        const x =
                          projectHistoryChartPadding.left +
                          (projectHistoryDomain.length === 1
                            ? projectHistoryChartInnerWidth / 2
                            : (projectHistoryChartInnerWidth / Math.max(projectHistoryDomain.length - 1, 1)) * index)

                        return (
                          <text
                            key={date}
                            className="project-area-x-label"
                            x={x}
                            y={projectHistoryChartHeight - 14}
                            textAnchor="middle"
                          >
                            {date.slice(5)}
                          </text>
                        )
                      })}
                    </svg>

                    <div className="project-area-chart-footer">
                      {projectHistoryChartData.map((project) => (
                        <button
                          key={project.projectId}
                          className={`project-area-stat ${
                            hiddenProjectHistoryIds.includes(project.projectId) ? 'is-muted' : ''
                          }`}
                          type="button"
                          onClick={() =>
                            setHiddenProjectHistoryIds((current) =>
                              current.includes(project.projectId)
                                ? current.filter((id) => id !== project.projectId)
                                : [...current, project.projectId],
                            )
                          }
                        >
                          <h4>{project.name}</h4>
                          <p>Saldo inicial {formatMoney(project.initialBalance.toFixed(2), project.currency)}</p>
                          <p>Disponible {formatMoney(project.available.toFixed(2), project.currency)}</p>
                          <p>
                            Gastos {formatMoney(
                              (
                                projectExpenseSeriesPaths.find((item) => item.projectId === project.projectId)
                                  ?.totalExpenses ?? 0
                              ).toFixed(2),
                              project.currency,
                            )}
                          </p>
                          <p>{project.receiptsCount} comprobantes</p>
                        </button>
                      ))}
                    </div>

                    {excludedProjectCount > 0 ? (
                      <p className="project-area-note">
                        {excludedProjectCount} proyectos quedaron fuera por mezclar monedas o no usar CRC.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="empty">No hay historial suficiente en proyectos activos CRC para graficar.</p>
                )}
              </article>

              <article className="card project-donut-card">
                <div className="section-title">
                  <div>
                    <h2>Distribucion de presupuesto por proyecto</h2>
                    <p className="muted">
                      Cada segmento representa el presupuesto total del proyecto.
                    </p>
                  </div>
                </div>

                {projectDonutSegments.length ? (
                  <div className="project-donut-layout">
                    <div className="project-donut-wrap">
                      <svg
                        className="project-donut-chart"
                        viewBox="0 0 264 264"
                        role="img"
                        aria-label="Grafico de dona por proyectos"
                      >
                        <circle className="project-donut-base" cx="132" cy="132" r="104" />
                        {projectDonutSegments.map((project) => (
                          <path key={project.projectId} d={project.path} fill={project.color} />
                        ))}
                        <circle className="project-donut-hole" cx="132" cy="132" r="60" />
                        <text className="project-donut-total-label" x="132" y="122" textAnchor="middle">
                          Total
                        </text>
                        <text className="project-donut-total-value" x="132" y="146" textAnchor="middle">
                          {formatNumberMask(projectDonutTotal)}
                        </text>
                      </svg>
                    </div>

                    <div className="project-donut-legend">
                      {projectDonutSegments.map((project) => (
                        <article key={project.projectId} className="project-donut-item">
                          <span
                            className="project-donut-swatch"
                            style={{ backgroundColor: project.color }}
                            aria-hidden="true"
                          />
                          <div>
                            <h4>{project.name}</h4>
                            <p>{project.percent.toFixed(1)}% del total</p>
                            <p>{formatMoney(project.total.toFixed(2), 'CRC')}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="empty">No hay proyectos activos con presupuesto total para representar en la dona.</p>
                )}
              </article>

              <article className="card project-map-card">
                <div className="section-title">
                  <div>
                    <h2>Mapa de proyectos en Costa Rica</h2>
                    <p className="muted">
                      Ubicaciones de proyectos activos segun sus coordenadas registradas.
                    </p>
                  </div>
                </div>

                {projectMapMarkers.length ? (
                  <div className="project-map-layout">
                    <div className="project-map-wrap">
                      <div className="project-map-canvas" role="img" aria-label="Mapa de Costa Rica con proyectos">
                        <img
                          className="project-map-image"
                          src={costaRicaMapImageUrl}
                          alt="Mapa de Costa Rica"
                        />
                        {projectMapMarkers.map((project) => (
                          <span
                            key={project.projectId}
                            className="project-map-marker"
                            style={{
                              left: `${project.xPercent}%`,
                              top: `${project.yPercent}%`,
                              backgroundColor: project.color,
                            }}
                            title={`${project.name} (${project.latitud.toFixed(4)}, ${project.longitud.toFixed(4)})`}
                          >
                            <span className="project-map-marker-core" />
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="project-map-legend">
                      {projectMapMarkers.map((project) => (
                        <article key={project.projectId} className="project-map-item">
                          <span
                            className="project-map-swatch"
                            style={{ backgroundColor: project.color }}
                            aria-hidden="true"
                          />
                          <div>
                            <h4>{project.name}</h4>
                            <p>{project.latitud.toFixed(4)}, {project.longitud.toFixed(4)}</p>
                            <p>{formatMoney(project.total.toFixed(2), 'CRC')}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="empty">No hay proyectos activos con coordenadas para mostrar en el mapa.</p>
                )}
              </article>
            </section>
          ) : activeDashboard === 'accounts' ? (
            <section className="panel-stack">
              <aside className="transfer-panel glass-panel" aria-label="Informacion para transferencia local">
                <div className="transfer-panel-header">
                  <span className="badge transfer-badge">{t('transfer.badge')}</span>
                  <h2>{localTransferDetails.title}</h2>
                </div>

                <div className="transfer-panel-body">
                  <div className="transfer-info-list">
                    <p><strong>{t('transfer.client')}:</strong> {localTransferDetails.clientName}</p>
                    <p><strong>{t('transfer.idNumber')}:</strong> {localTransferDetails.idNumber}</p>
                    <p><strong>{t('transfer.address')}:</strong> {localTransferDetails.address}</p>
                    <p><strong>{t('transfer.phone')}:</strong> {localTransferDetails.phone}</p>
                    <p><strong>{t('transfer.email')}:</strong> {localTransferDetails.email}</p>
                  </div>

                  <div className="transfer-account-list">
                    <p className="transfer-section-label">{t('transfer.iban')}</p>
                    {localTransferDetails.accounts.map((account) => (
                      <article className="transfer-account-card" key={account.iban}>
                        <p className="transfer-bank-name">{account.bank}</p>
                        <p className="transfer-iban">{account.iban}</p>
                      </article>
                    ))}
                  </div>

                  <div className="transfer-account-list">
                    <p className="transfer-section-label">{localTransferDetails.bcrAccount.title}</p>
                    <article className="transfer-account-card">
                      <p className="transfer-bank-name">{localTransferDetails.bcrAccount.holderName}</p>
                      <p className="transfer-iban">{localTransferDetails.bcrAccount.iban}</p>
                      <p className="transfer-account-meta">{localTransferDetails.bcrAccount.idNumber}</p>
                      <p className="transfer-account-meta">{localTransferDetails.bcrAccount.accountType}</p>
                      <p className="transfer-account-meta">{localTransferDetails.bcrAccount.currency}</p>
                    </article>
                  </div>
                </div>
              </aside>
            </section>
          ) : activeDashboard === 'exchange' ? (
            <ExchangeRateDashboard
              data={exchangeRateDashboard}
              error={exchangeRateError}
              isLoading={isExchangeRateLoading}
              onRefresh={() => {
                void loadExchangeRateDashboard()
              }}
            />
          ) : activeDashboard === 'users' ? (
            <UsersDashboard
              users={users}
              selectedUserId={selectedUserId}
              selectedUser={selectedUser}
              createUserForm={createUserForm}
              userForm={userForm}
              isBusy={isBusy}
              actionFeedback={actionFeedback}
              onSelectUser={setSelectedUserId}
              onCreateUserSubmit={handleUserCreate}
              onUpdateUserSubmit={handleUserUpdate}
              onToggleUserActive={(nextActive) => void handleUserToggleActive(nextActive)}
              onCreateUserFormChange={(patch) =>
                setCreateUserForm((current) => ({ ...current, ...patch }))
              }
              onUserFormChange={(patch) => setUserForm((current) => ({ ...current, ...patch }))}
            />
          ) : activeDashboard === 'icons' ? (
            <IconsDashboard onBack={() => setActiveDashboard('budgets')} />
          ) : activeDashboard === 'budgets' ? (
            <div id="budgets-section">
              {budgetSectionView === 'projects' ? (
                <ProjectsDashboard
                  projects={projects}
                  projectFilter={projectFilter}
                  projectForm={projectForm}
                  selectedProjectId={selectedProjectId}
                  selectedProject={selectedProject}
                  isBusy={!token || isBusy}
                  actionFeedback={actionFeedback}
                  onProjectFormChange={(patch) => setProjectForm((current) => ({ ...current, ...patch }))}
                  onCreateProject={handleProjectCreate}
                  onProjectFilterChange={handleProjectFilterChange}
                  onSelectProject={handleProjectSelect}
                  onUpdateProject={handleProjectUpdate}
                  onArchiveProject={() => void handleProjectArchive()}
                  onActivateProject={() => void handleProjectActivate()}
                  onOpenBudgets={openProjectBudgetsSection}
                />
              ) : (
              <ProjectBudgetsDashboard
                projects={projects}
                budgets={budgets}
                budgetForm={budgetForm}
                budgetMaintenanceForm={budgetMaintenanceForm}
                selectedProjectId={selectedProjectId}
                selectedBudgetId={selectedBudgetId}
                selectedBudget={selectedBudgetDetails}
                isBusy={!token || isBusy}
                actionFeedback={actionFeedback}
                onBudgetFormChange={(patch) => setBudgetForm((current) => ({ ...current, ...patch }))}
                onBudgetMaintenanceFormChange={(patch) =>
                  setBudgetMaintenanceForm((current) => ({ ...current, ...patch }))
                }
                onCreateBudget={handleBudgetCreate}
                onSelectBudget={setSelectedBudgetId}
                onUpdateBudget={handleBudgetUpdate}
                onOpenBudget={openBudgetDashboard}
                onBackToProjects={returnToProjectsSection}
                formatMoney={formatMoney}
                />
              )}
            </div>
          ) : (
            <section className="panel-stack">
          <article className="card-group">
            <div className="section-title">
              <h2>Crear comprobante</h2>
              <label className="field search-field">
                <span>Buscar</span>
                <input
                  className="input"
                  value={receiptFilter}
                  onChange={(event) => setReceiptFilter(event.target.value)}
                  placeholder="Negocio, descripcion o estado"
                />
              </label>
            </div>
            <form className="form-grid two-columns" onSubmit={handleReceiptCreate}>
              <label className="field">
                <span>Presupuesto</span>
                <input
                  className="input"
                  value={
                    selectedBudgetDetails
                      ? `${selectedBudgetDetails.categoria} / ${selectedBudgetDetails.moneda}`
                      : ''
                  }
                  readOnly
                />
              </label>
              <label className="field">
                <span>Fecha</span>
                <input
                  className="input"
                  type="date"
                  value={receiptForm.fecha}
                  onChange={(event) =>
                    setReceiptForm((current) => ({ ...current, fecha: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>{receiptNeedsIssuerData ? 'Factura *' : 'Factura'}</span>
                <input
                  className="input"
                  required={receiptNeedsIssuerData}
                  value={receiptForm.numero_factura}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      numero_factura: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>{receiptNeedsIssuerData ? 'Negocio *' : 'Negocio'}</span>
                <input
                  className="input"
                  required={receiptNeedsIssuerData}
                  value={receiptForm.negocio}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      negocio: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>{receiptNeedsIssuerData ? 'Cedula *' : 'Cedula'}</span>
                <input
                  className="input"
                  required={receiptNeedsIssuerData}
                  value={receiptForm.cedula}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      cedula: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Descripcion</span>
                <input
                  className="input"
                  value={receiptForm.descripcion}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      descripcion: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Monto del gasto</span>
                <input
                  className="input amount-input"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={receiptForm.monto_gasto}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      monto_gasto: sanitizeDecimalInput(event.target.value),
                    }))
                  }
                  onFocus={(event) => {
                    requestAnimationFrame(() => {
                      event.currentTarget.select()
                    })
                  }}
                  onMouseUp={(event) => {
                    event.preventDefault()
                    event.currentTarget.select()
                  }}
                />
              </label>
              <label className="field">
                <span>Moneda</span>
                <select
                  className="select"
                  value={receiptForm.moneda}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      moneda: event.target.value as Currency,
                    }))
                  }
                >
                  <option value="CRC">CRC</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              {requiresExchangeRate ? (
                <label className="field">
                  <span>Tipo de cambio</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.000001"
                    value={receiptForm.tipo_cambio}
                    onChange={(event) =>
                      setReceiptForm((current) => ({
                        ...current,
                        tipo_cambio: event.target.value,
                      }))
                    }
                    placeholder={`Convierte ${receiptForm.moneda} a ${selectedBudget?.moneda ?? ''}`}
                  />
                  <small className="field-hint">
                    {receiptForm.moneda === 'CRC' && selectedBudget?.moneda === 'USD'
                      ? 'Ingresa cuantos colones equivalen a 1 dolar. El sistema dividira el monto en CRC para llevarlo a USD.'
                      : 'Ingresa cuantos colones equivalen a 1 dolar. El sistema multiplicara el monto en USD para llevarlo a CRC.'}
                  </small>
                  {previewConvertedAmount ? (
                    <small className="field-preview">
                      Vista previa: {formatMoney(receiptForm.monto_gasto, receiptForm.moneda)} ={' '}
                      {formatMoney(previewConvertedAmount, selectedBudget?.moneda ?? receiptForm.moneda)}
                    </small>
                  ) : null}
                </label>
              ) : null}
              <label className="field">
                <span>Tipo</span>
                <select
                  className="select"
                  value={receiptForm.tipo_comprobante}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      tipo_comprobante: event.target.value as ReceiptType,
                    }))
                  }
                >
                  <option value="FACTURA_FOTO">Factura foto</option>
                  <option value="SINPE_MOVIL">SINPE movil</option>
                  <option value="CAJA_CHICA">Caja chica</option>
                </select>
              </label>
              <div className="field">
                <span>&nbsp;</span>
                <button
                  className="sync-btn"
                  type="submit"
                  disabled={
                    !token ||
                    isBusy ||
                    !selectedBudgetId ||
                    (requiresExchangeRate && !receiptForm.tipo_cambio)
                  }
                >
                  Crear comprobante
                </button>
                <ActionFeedback
                  message={actionFeedback?.target === 'receipt-create' ? actionFeedback.message : null}
                  tone={actionFeedback?.tone}
                />
              </div>
            </form>
          </article>

          <article className="card-group">
            <div className="section-title">
              <h2>Adjuntos del comprobante seleccionado</h2>
              <span className="list-meta">{attachments.length} archivos</span>
            </div>
            <div className="receipt-attachments-panel">
              <form className="form-grid two-columns" onSubmit={handleAttachmentCreate}>
                <label className="field">
                  <span>Ruta o URL</span>
                  <input
                    className="input"
                    value={attachmentForm.cdn_path}
                    onChange={(event) =>
                      setAttachmentForm((current) => ({ ...current, cdn_path: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Nombre</span>
                  <input
                    className="input"
                    value={attachmentForm.nombre_archivo}
                    onChange={(event) =>
                      setAttachmentForm((current) => ({
                        ...current,
                        nombre_archivo: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Tipo</span>
                  <input
                    className="input"
                    value={attachmentForm.tipo_archivo}
                    onChange={(event) =>
                      setAttachmentForm((current) => ({
                        ...current,
                        tipo_archivo: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Orden</span>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={attachmentForm.orden}
                    onChange={(event) =>
                      setAttachmentForm((current) => ({ ...current, orden: event.target.value }))
                    }
                  />
                </label>
                <div className="field">
                  <span>&nbsp;</span>
                  <div className="action-column">
                    <div className="attachment-submit-wrap">
                      <button
                        className="sync-btn"
                        type="submit"
                        disabled={!selectedReceiptId || isBusy || isAttachmentBusy}
                      >
                        <span className="button-with-icon">
                          <MdAttachFile aria-hidden="true" />
                          <span>
                            {isAttachmentBusy ? 'Registrando adjunto...' : 'Agregar adjunto'}
                          </span>
                        </span>
                      </button>
                      <div
                        className={`sync-loader ${isAttachmentBusy ? 'active' : ''}`}
                        aria-hidden="true"
                      >
                        <span className="loader-dot" />
                        <span className="loader-dot" />
                        <span className="loader-dot" />
                      </div>
                    </div>
                    <ActionFeedback
                      message={actionFeedback?.target === 'attachment-create' ? actionFeedback.message : null}
                      tone={actionFeedback?.tone}
                    />
                  </div>
                </div>
              </form>
              <div className="list-scroll compact-list">
                {attachments.map((attachment) => (
                  <article className="record-card" key={attachment.adjunto_id}>
                    <div className="record-head">
                      <div>
                        <h3>{attachment.nombre_archivo ?? 'Adjunto sin nombre'}</h3>
                        <p>{attachment.cdn_path}</p>
                        <p className="list-meta">
                          Comprobante:{' '}
                          {selectedReceipt?.numero_factura ||
                            selectedReceipt?.negocio ||
                            selectedReceiptId}
                        </p>
                      </div>
                      <button
                        className="tab-btn"
                        type="button"
                        onClick={() => void handleAttachmentDelete(attachment.adjunto_id)}
                        disabled={isBusy}
                      >
                        Eliminar
                      </button>
                    </div>
                    <ActionFeedback
                      message={
                        actionFeedback?.target === `attachment-delete-${attachment.adjunto_id}`
                          ? actionFeedback.message
                          : null
                      }
                      tone={actionFeedback?.tone}
                    />
                  </article>
                ))}
                {attachments.length === 0 ? (
                  <p className="empty">Selecciona un comprobante para ver adjuntos.</p>
                ) : null}
              </div>
            </div>
          </article>

          <article className="card-group">
            <div className="section-title">
              <h2>Comprobantes</h2>
              <span className="list-meta">Aprobados, pendientes, rechazados y sus adjuntos</span>
            </div>
            <div className="receipt-stack">
              {renderReceiptTable(
                'Comprobantes aprobados',
                approvedBudgetReceipts,
                'No hay comprobantes aprobados para este presupuesto.',
                {
                  label: isExportingApproved ? 'Exportando...' : 'Exportar a Excel',
                  onClick: () => void handleExportApprovedReceipts(),
                  disabled: isExportingApproved || approvedBudgetReceipts.length === 0,
                },
              )}
              {renderReceiptTable(
                'Comprobantes pendientes',
                pendingBudgetReceipts,
                'No hay comprobantes pendientes para este presupuesto.',
              )}
              {renderReceiptTable(
                'Comprobantes rechazados',
                rejectedBudgetReceipts,
                'No hay comprobantes rechazados para este presupuesto.',
              )}
            </div>
          </article>

            </section>
          )}
        </div>

      </section>

      <footer className="site-footer">
        <p>© 2026 Transactions-site lkccorp, powered by REACT</p>
      </footer>
    </main>
  )
}

export default App
