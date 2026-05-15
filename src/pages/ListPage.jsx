import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, floorSortIndex } from '../lib/supabase'
import styles from './ListPage.module.css'

const FLOOR_FILTERS = ['すべて', 'RF・39F〜20F', '19F〜01F・B1F']
const SORT_OPTIONS = [
  { value: 'floor',   label: '階数順' },
  { value: 'created', label: '登録順' },
  { value: 'updated', label: '更新順' },
]

const SS_FLOOR = 'list_floorFilter'
const SS_DONE  = 'list_showDone'
const SS_SORT  = 'list_sort'

function matchFloorFilter(floor, filter) {
  if (filter === 'すべて') return true
  if (filter === 'RF・39F〜20F') {
    if (floor === 'RF') return true
    const n = parseInt(floor)
    return !isNaN(n) && n >= 20 && n <= 39
  }
  if (filter === '19F〜01F・B1F') {
    if (floor === 'B1F') return true
    const n = parseInt(floor)
    return !isNaN(n) && n >= 1 && n <= 19
  }
  return true
}

function sortItems(items, sort) {
  if (sort === 'floor')   return [...items].sort((a, b) => floorSortIndex(a.floor) - floorSortIndex(b.floor))
  if (sort === 'created') return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  if (sort === 'updated') return [...items].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  return items
}

export default function ListPage() {
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [thumbMap, setThumbMap] = useState({})

  const [floorFilter, setFloorFilter] = useState(() => sessionStorage.getItem(SS_FLOOR) || 'すべて')
  const [showDone,    setShowDone]    = useState(() => sessionStorage.getItem(SS_DONE) === 'true')
  const [sort,        setSort]        = useState(() => sessionStorage.getItem(SS_SORT)  || 'floor')

  function changeFloorFilter(v) { setFloorFilter(v); sessionStorage.setItem(SS_FLOOR, v) }
  function changeShowDone(v)    { setShowDone(v);    sessionStorage.setItem(SS_DONE, String(v)) }
  function changeSort(v)        { setSort(v);        sessionStorage.setItem(SS_SORT, v) }

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('damages')
      .select('id, floor, location, remarks, is_done, created_at, updated_at')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })

    if (error) { console.error(error); setLoading(false); return }

    const ids = (data || []).map(d => d.id)
    if (ids.length > 0) {
      const { data: imgs } = await supabase
        .from('damage_images')
        .select('damage_id, storage_path')
        .in('damage_id', ids)
        .order('created_at', { ascending: true })

      const map = {}
      ;(imgs || []).forEach(img => {
        if (!map[img.damage_id]) {
          const { data: urlData } = supabase.storage
            .from('damage-images')
            .getPublicUrl(img.storage_path)
          map[img.damage_id] = urlData?.publicUrl || null
        }
      })
      setThumbMap(map)
    }

    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const filtered = sortItems(
    items
      .filter(item => matchFloorFilter(item.floor, floorFilter))
      .filter(item => showDone || !item.is_done),
    sort
  )

  const sortLabel = sort === 'floor' ? '階数順（高→低）' : sort === 'created' ? '登録順（新しい順）' : '更新順（新しい順）'

  return (
    <div className={styles.page}>
      <div className="nav-bar">
        <span className="nav-title">傷情報一覧</span>
        <button className="nav-icon-btn" onClick={fetchItems} title="更新">
          <svg viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        </button>
        <button className="nav-icon-btn" onClick={() => supabase.auth.signOut()} title="ログアウト">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.chips}>
          {FLOOR_FILTERS.map(f => (
            <button
              key={f}
              className={`${styles.chip} ${floorFilter === f ? styles.chipOn : ''}`}
              onClick={() => changeFloorFilter(f)}
            >{f}</button>
          ))}
        </div>
        <div className={styles.filterRow2}>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={showDone} onChange={e => changeShowDone(e.target.checked)} />
            対応済を含む
          </label>
          <select className={styles.sortSelect} value={sort} onChange={e => changeSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.sortLabel}>{sortLabel}</div>

      {loading ? (
        <div className={styles.empty}>読み込み中…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>該当する記録がありません</div>
      ) : (
        <div className={styles.list}>
          {filtered.map(item => (
            <div key={item.id} className={styles.card} onClick={() => navigate(`/detail/${item.id}`)}>
              <div className={styles.thumb}>
                {thumbMap[item.id] ? (
                  <img src={thumbMap[item.id]} alt="" className={styles.thumbImg} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9l4-4 4 4 4-4 4 4"/>
                  </svg>
                )}
                <span className={styles.floorBadge}>{item.floor}</span>
                {item.is_done && <span className={styles.doneBadge}>済</span>}
              </div>
              <div className={styles.meta}>
                <div className={styles.place}>{item.location}</div>
                <div className={styles.sub}>{item.remarks ? item.remarks.replace(/\n/g, ' ') : ''}</div>
              </div>
              <span className={styles.arrow}>›</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.fabWrap}>
        <button className={styles.fab} onClick={() => navigate('/register')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新規登録
        </button>
      </div>
    </div>
  )
}
