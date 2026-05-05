import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './DetailPage.module.css'

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [images, setImages] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)   // ライトボックス表示中か
  const [lbIdx, setLbIdx] = useState(0)             // ライトボックスで表示中の index
  // タッチスワイプ用
  const [touchStartX, setTouchStartX] = useState(null)

  function openLightbox(idx) {
    setLbIdx(idx)
    setLightbox(true)
    document.body.style.overflow = 'hidden'
  }

  function closeLightbox() {
    setLightbox(false)
    document.body.style.overflow = ''
  }

  const lbPrev = useCallback(() => {
    setLbIdx(i => (i - 1 + images.length) % images.length)
  }, [images.length])

  const lbNext = useCallback(() => {
    setLbIdx(i => (i + 1) % images.length)
  }, [images.length])

  // 画面を離れるときに必ず overflow をリセット
  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])
  useEffect(() => {
    if (!lightbox) return
    function onKey(e) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') lbPrev()
      if (e.key === 'ArrowRight') lbNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, lbPrev, lbNext])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: damage } = await supabase
        .from('damages')
        .select('*')
        .eq('id', id)
        .single()

      if (!damage) { navigate('/'); return }
      setItem(damage)

      const { data: imgs } = await supabase
        .from('damage_images')
        .select('storage_path')
        .eq('damage_id', id)
        .order('created_at', { ascending: true })

      const urls = (imgs || []).map(img => {
        const { data } = supabase.storage
          .from('damage-images')
          .getPublicUrl(img.storage_path)
        return data?.publicUrl || null
      }).filter(Boolean)

      setImages(urls)
      setLoading(false)
    }
    load()
  }, [id, navigate])

  function formatDateTime(str) {
    if (!str) return '—'
    const d = new Date(str)
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  if (loading) return (
    <div className="page-white">
      <div className="nav-bar">
        <button className="nav-icon-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="nav-title">傷情報詳細</span>
      </div>
      <div className={styles.loading}>読み込み中…</div>
    </div>
  )

  return (
    <div className="page-white">
      {/* ナビゲーション */}
      <div className="nav-bar">
        <button className="nav-icon-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="nav-title">傷情報詳細</span>
        <button className="nav-icon-btn" onClick={() => navigate(`/edit/${id}`)} title="編集">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>

      {/* メイン画像 */}
      <div className={styles.hero}>
        {images.length > 0 ? (
          <button className={styles.heroBtn} onClick={() => openLightbox(activeIdx)}>
            <img src={images[activeIdx]} alt="傷の写真" className={styles.heroImg} />
            <span className={styles.heroZoomHint}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              タップで拡大
            </span>
          </button>
        ) : (
          <div className={styles.heroEmpty}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" width="48" height="48">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9l4-4 4 4 4-4 4 4"/>
              <circle cx="8.5" cy="8.5" r="1"/>
            </svg>
            <span>写真なし</span>
          </div>
        )}
        {images.length > 1 && (
          <div className={styles.heroPager}>{activeIdx + 1} / {images.length}</div>
        )}
      </div>

      {/* サムネイル */}
      {images.length > 1 && (
        <div className={styles.thumbRow}>
          {images.map((url, i) => (
            <button
              key={i}
              className={`${styles.thumb} ${i === activeIdx ? styles.thumbActive : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              <img src={url} alt="" className={styles.thumbImg} />
            </button>
          ))}
        </div>
      )}

      {/* ライトボックス */}
      {lightbox && (
        <div
          className={styles.lbOverlay}
          onClick={closeLightbox}
          onTouchStart={e => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={e => {
            if (touchStartX === null) return
            const dx = e.changedTouches[0].clientX - touchStartX
            if (Math.abs(dx) > 50) { dx < 0 ? lbNext() : lbPrev() }
            setTouchStartX(null)
          }}
        >
          {/* 閉じるボタン */}
          <button className={styles.lbClose} onClick={closeLightbox}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* 枚数 */}
          {images.length > 1 && (
            <div className={styles.lbPager}>{lbIdx + 1} / {images.length}</div>
          )}

          {/* 画像 */}
          <img
            src={images[lbIdx]}
            alt=""
            className={styles.lbImg}
            onClick={e => e.stopPropagation()}
          />

          {/* 前後ボタン（複数枚時） */}
          {images.length > 1 && (
            <>
              <button className={`${styles.lbArrow} ${styles.lbArrowL}`}
                onClick={e => { e.stopPropagation(); lbPrev() }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <button className={`${styles.lbArrow} ${styles.lbArrowR}`}
                onClick={e => { e.stopPropagation(); lbNext() }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* 詳細情報 */}
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.key}>階数</span>
          <span className={styles.val}>{item.floor}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>場所</span>
          <span className={styles.val}>{item.location}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>対応状況</span>
          {item.is_done ? (
            <span className={styles.donePill}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22a06b" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              対応済
            </span>
          ) : (
            <span className={styles.pendingPill}>未対応</span>
          )}
        </div>
        <div className={styles.row}>
          <span className={styles.key}>更新日時</span>
          <span className={styles.val}>{formatDateTime(item.updated_at)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.key}>登録日時</span>
          <span className={styles.val}>{formatDateTime(item.created_at)}</span>
        </div>
      </div>

      {/* 備考 */}
      {item.remarks && (
        <div className={styles.remarksSection}>
          <div className={styles.remarksLabel}>備考</div>
          <div className={styles.remarksBox}>{item.remarks}</div>
        </div>
      )}

      {/* 編集ボタン */}
      <div className={styles.editWrap}>
        <button className={styles.editBtn} onClick={() => navigate(`/edit/${id}`)}>
          編集する
        </button>
      </div>
    </div>
  )
}
