import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, FLOOR_OPTIONS } from '../lib/supabase'
import styles from './RegisterPage.module.css'

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isAndroid = /Android/.test(navigator.userAgent)
const isMobile = isIOS || isAndroid

export default function RegisterPage() {
  const navigate = useNavigate()
  const { id } = useParams()        // 編集時のみ存在
  const isEdit = Boolean(id)

  const [floor, setFloor] = useState('39F')
  const [location, setLocation] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isDone, setIsDone] = useState(false)
  const [photos, setPhotos] = useState([])          // { file, preview, existing?: storageUrl }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cameraRef = useRef()
  const galleryRef = useRef()
  const fileRef = useRef()

  // 編集時：既存データを読み込む
  useEffect(() => {
    if (!isEdit) return
    async function load() {
      const { data: damage } = await supabase
        .from('damages')
        .select('*')
        .eq('id', id)
        .single()
      if (!damage) { navigate('/'); return }
      setFloor(damage.floor)
      setLocation(damage.location)
      setRemarks(damage.remarks || '')
      setIsDone(damage.is_done)

      const { data: imgs } = await supabase
        .from('damage_images')
        .select('id, storage_path')
        .eq('damage_id', id)
        .order('created_at', { ascending: true })

      const existing = (imgs || []).map(img => {
        const { data } = supabase.storage
          .from('damage-images')
          .getPublicUrl(img.storage_path)
        return { imageId: img.id, storagePath: img.storage_path, preview: data?.publicUrl, existing: true }
      })
      setPhotos(existing)
    }
    load()
  }, [id, isEdit, navigate])

  async function resizeImage(file, maxSize = 1920, quality = 0.85) {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const { naturalWidth: w, naturalHeight: h } = img
        // 長辺がmaxSize以下ならそのまま返す
        if (w <= maxSize && h <= maxSize) { resolve(file); return }
        const ratio = Math.min(maxSize / w, maxSize / h)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(w * ratio)
        canvas.height = Math.round(h * ratio)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
        }, 'image/jpeg', quality)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  async function addFiles(files) {
    const resized = await Promise.all(Array.from(files).map(f => resizeImage(f)))
    const newPhotos = resized.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      existing: false,
    }))
    setPhotos(prev => [...prev, ...newPhotos])
  }

  function removePhoto(idx) {
    setPhotos(prev => {
      const next = [...prev]
      if (!next[idx].existing) URL.revokeObjectURL(next[idx].preview)
      next.splice(idx, 1)
      return next
    })
  }

  async function handleSubmit() {
    if (!location.trim()) { setError('場所を入力してください'); return }
    setError('')
    setSaving(true)

    try {
      let damageId = id

      if (isEdit) {
        // 更新
        const { error: upErr } = await supabase
          .from('damages')
          .update({ floor, location: location.trim(), remarks: remarks.trim(), is_done: isDone, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (upErr) throw upErr

        // 削除されたexisting画像をSupabase Storageから消す
        const existingInState = photos.filter(p => p.existing).map(p => p.storagePath)
        const { data: allImgs } = await supabase
          .from('damage_images')
          .select('id, storage_path')
          .eq('damage_id', id)
        for (const img of allImgs || []) {
          if (!existingInState.includes(img.storage_path)) {
            await supabase.storage.from('damage-images').remove([img.storage_path])
            await supabase.from('damage_images').delete().eq('id', img.id)
          }
        }
      } else {
        // 新規作成
        const { data: newDamage, error: insErr } = await supabase
          .from('damages')
          .insert({ floor, location: location.trim(), remarks: remarks.trim(), is_done: isDone })
          .select('id')
          .single()
        if (insErr) throw insErr
        damageId = newDamage.id
      }

      // 新規ファイルをアップロード
      const newPhotos = photos.filter(p => !p.existing)
      for (const photo of newPhotos) {
        const ext = photo.file.name.split('.').pop()
        const path = `${damageId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('damage-images')
          .upload(path, photo.file, { contentType: photo.file.type })
        if (upErr) throw upErr
        const { error: imgErr } = await supabase
          .from('damage_images')
          .insert({ damage_id: damageId, storage_path: path })
        if (imgErr) throw imgErr
      }

      navigate(isEdit ? `/detail/${damageId}` : '/')
    } catch (e) {
      console.error(e)
      setError('保存中にエラーが発生しました: ' + (e.message || ''))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-white">
      {/* ナビゲーション */}
      <div className="nav-bar">
        <button className="nav-icon-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="nav-title">{isEdit ? '編集' : '新規登録'}</span>
      </div>

      <div className={styles.body}>
        {/* 階数 */}
        <div className={styles.field}>
          <label className={styles.label}>階数</label>
          <div className={styles.selectWrap}>
            <select
              className={styles.select}
              value={floor}
              onChange={e => setFloor(e.target.value)}
            >
              {FLOOR_OPTIONS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <svg className={styles.selectArrow} viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* 場所 */}
        <div className={styles.field}>
          <label className={styles.label}>場所</label>
          <input
            className={styles.input}
            type="text"
            placeholder="例：北側廊下 壁面"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        {/* 写真 */}
        <div className={styles.field}>
          <label className={styles.label}>写真</label>

          {/* プレビュー */}
          {photos.length > 0 && (
            <div className={styles.previewRow}>
              {photos.map((p, i) => (
                <div key={i} className={styles.previewItem}>
                  <img src={p.preview} alt="" className={styles.previewImg} />
                  <button className={styles.removeBtn} onClick={() => removePhoto(i)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.photoZone}>
            {photos.length === 0 && (
              <div className={styles.photoHint}>写真を追加してください</div>
            )}

            {/* hidden inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />

            {isMobile ? (
              <div className={styles.photoBtns}>
                <button className={styles.photoBtn} type="button" onClick={() => cameraRef.current.click()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="13" r="4"/>
                    <path d="M20 7h-2.2l-1.4-2H7.6L6.2 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                  </svg>
                  カメラで撮影
                </button>
                <button className={styles.photoBtn} type="button" onClick={() => galleryRef.current.click()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9l4-4 4 4 4-4 4 4"/>
                  </svg>
                  ギャラリー
                </button>
              </div>
            ) : (
              <button className={styles.photoBtnWide} type="button" onClick={() => fileRef.current.click()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                ファイルを選択
              </button>
            )}
          </div>
        </div>

        {/* 備考 */}
        <div className={styles.field}>
          <label className={styles.label}>備考</label>
          <textarea
            className={styles.textarea}
            placeholder="業者連絡済、工事予定日など…"
            rows={3}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        {/* 対応済チェック */}
        <label className={styles.checkWrap}>
          <input
            type="checkbox"
            checked={isDone}
            onChange={e => setIsDone(e.target.checked)}
          />
          対応済にする
        </label>

        {/* エラー */}
        {error && <div className={styles.error}>{error}</div>}

        {/* 登録ボタン */}
        <button
          className={styles.submit}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? '保存中…' : isEdit ? '更新する' : '登録する'}
        </button>
      </div>
    </div>
  )
}
