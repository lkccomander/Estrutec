import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
  HiOutlineFolderOpen,
  HiOutlineUsers,
} from 'react-icons/hi2'
import { FiActivity, FiBell, FiCalendar, FiFolder, FiSearch, FiSettings } from 'react-icons/fi'
import { FaArrowTrendUp, FaFileInvoiceDollar, FaMoneyBillTransfer, FaRegCreditCard } from 'react-icons/fa6'
import { MdAttachFile, MdDashboard, MdOutlineAccountBalanceWallet, MdOutlinePayments } from 'react-icons/md'
import { PiChartPieSliceBold, PiReceiptBold, PiPiggyBankBold, PiWalletBold } from 'react-icons/pi'
import { TbCoins, TbFolderDollar, TbReportMoney, TbTransferIn } from 'react-icons/tb'
import { IoBusinessOutline, IoCashOutline, IoDocumentTextOutline, IoPeopleOutline } from 'react-icons/io5'
import type { IconType } from 'react-icons'

type IconGroup = {
  title: string
  items: Array<[string, IconType]>
}

const iconGroups: IconGroup[] = [
  {
    title: 'Heroicons',
    items: [
      ['HiOutlineBanknotes', HiOutlineBanknotes],
      ['HiOutlineChartBar', HiOutlineChartBar],
      ['HiOutlineUsers', HiOutlineUsers],
      ['HiOutlineFolderOpen', HiOutlineFolderOpen],
      ['HiOutlineClipboardDocumentList', HiOutlineClipboardDocumentList],
      ['HiOutlineAcademicCap', HiOutlineAcademicCap],
      ['HiOutlineExclamationTriangle', HiOutlineExclamationTriangle],
    ],
  },
  {
    title: 'Feather',
    items: [
      ['FiActivity', FiActivity],
      ['FiCalendar', FiCalendar],
      ['FiSearch', FiSearch],
      ['FiFolder', FiFolder],
      ['FiBell', FiBell],
      ['FiSettings', FiSettings],
    ],
  },
  {
    title: 'Font Awesome',
    items: [
      ['FaRegCreditCard', FaRegCreditCard],
      ['FaFileInvoiceDollar', FaFileInvoiceDollar],
      ['FaMoneyBillTransfer', FaMoneyBillTransfer],
      ['FaArrowTrendUp', FaArrowTrendUp],
    ],
  },
  {
    title: 'Material',
    items: [
      ['MdDashboard', MdDashboard],
      ['MdAttachFile', MdAttachFile],
      ['MdOutlinePayments', MdOutlinePayments],
      ['MdOutlineAccountBalanceWallet', MdOutlineAccountBalanceWallet],
    ],
  },
  {
    title: 'Phosphor',
    items: [
      ['PiReceiptBold', PiReceiptBold],
      ['PiWalletBold', PiWalletBold],
      ['PiPiggyBankBold', PiPiggyBankBold],
      ['PiChartPieSliceBold', PiChartPieSliceBold],
    ],
  },
  {
    title: 'Tabler',
    items: [
      ['TbCoins', TbCoins],
      ['TbFolderDollar', TbFolderDollar],
      ['TbTransferIn', TbTransferIn],
      ['TbReportMoney', TbReportMoney],
    ],
  },
  {
    title: 'Ionicons',
    items: [
      ['IoCashOutline', IoCashOutline],
      ['IoDocumentTextOutline', IoDocumentTextOutline],
      ['IoPeopleOutline', IoPeopleOutline],
      ['IoBusinessOutline', IoBusinessOutline],
    ],
  },
]

type IconsDashboardProps = {
  onBack: () => void
}

export function IconsDashboard({ onBack }: IconsDashboardProps) {
  return (
    <section className="panel-stack">
      <article className="card-group">
        <div className="section-title">
          <h2>Galeria de iconos React</h2>
          <button className="tab-btn" type="button" onClick={onBack}>
            Volver a rubros
          </button>
        </div>
        <p className="list-meta">
          Muestra una seleccion amplia de iconos de `react-icons` para elegir visualmente.
        </p>
      </article>

      {iconGroups.map((group) => (
        <article className="card-group" key={group.title}>
          <div className="section-title">
            <h2>{group.title}</h2>
            <span className="list-meta">{group.items.length} iconos</span>
          </div>
          <div className="icons-grid">
            {group.items.map(([label, Icon]) => (
              <div className="icon-card" key={label}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}
