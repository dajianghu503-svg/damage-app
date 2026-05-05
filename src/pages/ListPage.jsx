import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, floorSortIndex } from '../lib/supabase'
import styles from './ListPage.module.css'

const FLOOR_FILTERS = ['すべて', 'RF・39F〜20F', '19F〜01F・B1F']

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

export default function ListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [floorFilter, setFloorFilter] = useState('すべて')
  const [showDone, setShowDone] = useState(false)
  const [thumbMap, setThumbMap] = useState({})

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('damages')
      .select('id, floor, location, remarks, is_done, updated_at')
      .order('updated_at', { ascending: false })

    if (error) { console.error(error); setLoading(false); return }

    // 画像の取得（各レコードの最初の1枚）
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

  const filtered = items
    .filter(item => matchFloorFilter(item.floor, floorFilter))
    .filter(item => showDone || !item.is_done)
    .sort((a, b) => floorSortIndex(a.floor) - floorSortIndex(b.floor))

  function formatDate(str) {
    if (!str) return ''
    const d = new Date(str)
    return `${d.getMonth() + 1}/${d.getDate()} 更新`
  }

  return (
    <div className={styles.page}>
      {/* ナビゲーション */}
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

      {/* フィルターバー */}
      <div className={styles.filterBar}>
        <div className={styles.chips}>
          {FLOOR_FILTERS.map(f => (
            <button
              key={f}
              className={`${styles.chip} ${floorFilter === f ? styles.chipOn : ''}`}
              onClick={() => setFloorFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={showDone}
            onChange={e => setShowDone(e.target.checked)}
          />
          対応済を含む
        </label>
      </div>

      {/* ソートラベル */}
      <div className={styles.sortLabel}>階数順（高→低）</div>

      {/* リスト */}
      {loading ? (
        <div className={styles.empty}>読み込み中…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>該当する記録がありません</div>
      ) : (
        <div className={styles.list}>
          {filtered.map(item => (
            <div
              key={item.id}
              className={styles.card}
              onClick={() => navigate(`/detail/${item.id}`)}
            >
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

      {/* 新規登録ボタン */}
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
