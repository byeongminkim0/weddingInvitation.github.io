import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, orderBy, query, limit, startAfter, Timestamp, QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Upload, X, Loader2, Trash2, Camera, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const MODERN = {
  card: "bg-white backdrop-blur-sm",
  
  // 텍스트 크기 공통 관리
  text: {
    title: "text-xl sm:text-2xl",        // 섹션 제목
    subtitle: "text-lg sm:text-xl",      // 부제목
    body: "text-sm sm:text-base",        // 기본 본문
    small: "text-xs sm:text-sm",         // 작은 텍스트
    caption: "text-xs",                  // 캡션/힌트
  }
};

const PHOTOS_PER_PAGE = 12;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 20; // 최대 업로드 파일 수

// Cloudflare R2 Worker API URL
const R2_API_URL = import.meta.env.VITE_R2_API_URL || 'https://wedding-r2-api.byeongmin564.workers.dev';

interface GuestPhoto {
  id: string;
  imageUrl: string;
  uploaderName: string;
  createdAt: Date;
  r2Key: string; // R2 오브젝트 키
  passwordHash: string; // 비밀번호 해시
}

export function GuestGallery() {
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // 업로드 폼
  const [uploaderName, setUploaderName] = useState('');
  const [uploadPassword, setUploadPassword] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
  // 라이트박스 (사진 크게 보기)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // 모바일 체크 함수
  const isMobile = () => window.innerWidth < 768;
  
  const openLightbox = (index: number) => {
    // 모바일에서는 라이트박스를 열지 않음
    if (!isMobile()) {
      setLightboxIndex(index);
    }
  };
  const closeLightbox = () => setLightboxIndex(null);
  const goToPreviousPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
    }
  };
  const goToNextPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % photos.length);
    }
  };
  
  // 삭제 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<GuestPhoto | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    loadPhotos();
  }, []);

  // 비밀번호 해시 함수
  async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 사진 로드
  async function loadPhotos() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'guestGallery'),
        orderBy('createdAt', 'desc'),
        limit(PHOTOS_PER_PAGE)
      );
      
      const snapshot = await getDocs(q);
      
      const loadedPhotos = snapshot.docs.map(doc => ({
        id: doc.id,
        imageUrl: doc.data().imageUrl,
        uploaderName: doc.data().uploaderName,
        r2Key: doc.data().r2Key || doc.data().storagePath, // 하위 호환성
        passwordHash: doc.data().passwordHash || '', // 하위 호환성
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setPhotos(loadedPhotos);
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      setHasMore(snapshot.docs.length === PHOTOS_PER_PAGE);
    } catch (error) {
      console.error('사진 로드 실패:', error);
      alert('사진을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  // 더 많은 사진 로드
  async function loadMorePhotos() {
    if (!lastDoc || !hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const q = query(
        collection(db, 'guestGallery'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PHOTOS_PER_PAGE)
      );
      
      const snapshot = await getDocs(q);
      
      const newPhotos = snapshot.docs.map(doc => ({
        id: doc.id,
        imageUrl: doc.data().imageUrl,
        uploaderName: doc.data().uploaderName,
        r2Key: doc.data().r2Key || doc.data().storagePath,
        passwordHash: doc.data().passwordHash || '', // 하위 호환성
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setPhotos(prev => [...prev, ...newPhotos]);
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      setHasMore(snapshot.docs.length === PHOTOS_PER_PAGE);
    } catch (error) {
      console.error('추가 사진 로드 실패:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  // 파일 선택 (다중)
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 최대 파일 개수 체크
    if (files.length > MAX_FILES) {
      alert(`최대 ${MAX_FILES}개까지 선택할 수 있습니다`);
      return;
    }

    // 파일 크기 및 타입 체크
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}의 크기가 5MB를 초과합니다`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}은(는) 이미지 파일이 아닙니다`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setSelectedFiles(validFiles);
    
    // 미리보기 생성
    const urls: string[] = [];
    let loadedCount = 0;
    
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        urls.push(reader.result as string);
        loadedCount++;
        
        if (loadedCount === validFiles.length) {
          setPreviewUrls(urls);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // 사진 업로드 (여러 장)
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!uploaderName.trim()) {
      alert('이름을 입력해주세요');
      return;
    }

    if (!uploadPassword.trim()) {
      alert('비밀번호를 입력해주세요 (삭제 시 필요)');
      return;
    }

    if (uploadPassword.length < 4) {
      alert('비밀번호는 4자 이상 입력해주세요');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('사진을 선택해주세요');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setCurrentFileIndex(0);

      // 1️⃣ 비밀번호 해시화
      const passwordHash = await hashPassword(uploadPassword);

      const totalFiles = selectedFiles.length;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setCurrentFileIndex(i + 1);

        // 2️⃣ Presigned URL 요청
        const urlResponse = await fetch(`${R2_API_URL}/api/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });

        if (!urlResponse.ok) {
          const error = await urlResponse.json();
          throw new Error(error.error || '업로드 URL 생성 실패');
        }

        const { uploadUrl, publicUrl, key } = await urlResponse.json();

        // 3️⃣ R2에 직접 업로드
        const uploadResponse = await fetch(`${uploadUrl}?key=${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`${file.name} R2 업로드 실패`);
        }

        // 4️⃣ Firestore에 메타데이터 저장
        await addDoc(collection(db, 'guestGallery'), {
          imageUrl: publicUrl,
          uploaderName: uploaderName.trim(),
          r2Key: key,
          passwordHash: passwordHash,
          createdAt: Timestamp.now()
        });

        // 진행률 업데이트
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        setUploadProgress(progress);
      }

      // 폼 초기화
      setUploaderName('');
      setUploadPassword('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress(0);
      setCurrentFileIndex(0);
      
      // 목록 새로고침
      await loadPhotos();
      
      alert(`${totalFiles}장의 사진이 업로드되었습니다! 📸`);
    } catch (error) {
      console.error('업로드 실패:', error);
      alert(`업로드에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setUploadProgress(0);
      setCurrentFileIndex(0);
    } finally {
      setUploading(false);
    }
  }

  // 사진 삭제 (R2 + Firestore)
  async function handleDelete() {
    if (!photoToDelete) return;

    if (!deletePassword.trim()) {
      alert('비밀번호를 입력해주세요');
      return;
    }

    try {
      // 1️⃣ 비밀번호 확인
      const inputHash = await hashPassword(deletePassword);
      
      if (inputHash !== photoToDelete.passwordHash) {
        alert('비밀번호가 일치하지 않습니다');
        return;
      }

      // 2️⃣ Firestore에서 삭제
      await deleteDoc(doc(db, 'guestGallery', photoToDelete.id));
      
      // 3️⃣ R2에서 삭제
      try {
        await fetch(`${R2_API_URL}/api/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: photoToDelete.r2Key,
          }),
        });
      } catch (error) {
        console.error('R2 삭제 실패:', error);
        // R2 삭제 실패해도 계속 진행
      }

      // 4️⃣ 로컬 상태 업데이트
      setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
      
      setShowDeleteModal(false);
      setPhotoToDelete(null);
      setDeletePassword('');
      alert('사진이 삭제되었습니다');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다');
    }
  }

  // 미리보기 삭제
  function removePreview(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  }

  return (
    <>
      {/* 타이틀 */}
      <div className="text-center mb-6 sm:mb-8">
        <EllipseBadge text="GUEST GALLERY" />
        <br />
        <h2 className={`${MODERN.text.title} font-semibold text-gray-900 mb-2`}>
          하객 갤러리
        </h2>
        <p className={`${MODERN.text.small} text-gray-600`}>
          결혼식의 소중한 순간을 함께 나눠주세요
        </p>
      </div>

      {/* 업로드 폼 */}
      <Card className="p-5 sm:p-6 mb-6 sm:mb-8">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className={`block ${MODERN.text.small} font-medium text-gray-700 mb-2`}>
              이름
            </label>
            <input
              type="text"
              placeholder="홍길동"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              maxLength={20}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${MODERN.text.body}`}
              disabled={uploading}
            />
          </div>

          <div>
            <label className={`block ${MODERN.text.small} font-medium text-gray-700 mb-2`}>
              비밀번호 <span className={`${MODERN.text.caption} text-gray-500`}>(4자 이상, 삭제 시 필요)</span>
            </label>
            <input
              type="password"
              placeholder="••••"
              value={uploadPassword}
              onChange={(e) => setUploadPassword(e.target.value)}
              minLength={4}
              maxLength={20}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${MODERN.text.body}`}
              disabled={uploading}
            />
          </div>

          {/* 파일 선택 */}
          <div>
            <label className={`block ${MODERN.text.small} font-medium text-gray-700 mb-2`}>
              사진 선택 <span className={`${MODERN.text.caption} text-gray-500`}>(최대 {MAX_FILES}장, 각 5MB 이하)</span>
            </label>
            
            {/* 미리보기 그리드 */}
            {previewUrls.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePreview(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                      disabled={uploading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* 추가 업로드 버튼 */}
                {previewUrls.length < MAX_FILES && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <p className={`${MODERN.text.caption} text-gray-500`}>추가</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 sm:h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-3" />
                  <p className={`mb-2 ${MODERN.text.small} text-gray-600`}>
                    <span className="font-semibold">클릭하여 사진 선택</span>
                  </p>
                  <p className={`${MODERN.text.caption} text-gray-500`}>
                    JPG, PNG, GIF, WEBP (최대 {MAX_FILES}장, 각 5MB)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* 업로드 진행률 */}
          {uploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className={`flex justify-between ${MODERN.text.small} text-gray-600`}>
                <span>{currentFileIndex} / {selectedFiles.length} 업로드 중...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-black h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
            className={`w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed ${MODERN.text.body} flex items-center justify-center gap-2`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                업로드 중... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                사진 올리기 ({selectedFiles.length}장)
              </>
            )}
          </button>
        </form>
      </Card>

      {/* 사진 그리드 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className={MODERN.text.body}>사진을 불러오는 중...</p>
        </div>
      ) : photos.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className={`${MODERN.text.body} text-gray-600`}>
            첫 번째 사진을 올려주세요!
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg shadow hover:shadow-lg transition"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={photo.imageUrl}
                  alt={`${photo.uploaderName}님의 사진`}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  loading="lazy"
                />
                
                {/* 오버레이 */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                  <p className={`text-white ${MODERN.text.small} font-semibold mb-1`}>
                    {photo.uploaderName}
                  </p>
                  <p className={`text-white ${MODERN.text.caption}`}>
                    {formatDate(photo.createdAt)}
                  </p>
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoToDelete(photo);
                    setShowDeleteModal(true);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                  title="삭제"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* 더보기 버튼 */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMorePhotos}
                disabled={loadingMore}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed ${MODERN.text.body} font-medium shadow-sm`}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    불러오는 중...
                  </>
                ) : (
                  <>더보기 ({PHOTOS_PER_PAGE}개씩)</>
                )}
              </button>
            </div>
          )}

          {/* 사진 개수 */}
          <div className={`text-center mt-6 ${MODERN.text.small} text-gray-500`}>
            {hasMore ? (
              <>현재 {photos.length}개의 사진 (더보기로 추가 확인 가능)</>
            ) : (
              <>총 {photos.length}개의 사진</>
            )}
          </div>
        </>
      )}

      {/* 라이트박스 (사진 크게 보기) - 데스크톱에서만 */}
      {lightboxIndex !== null && photos[lightboxIndex] && !isMobile() && (
        <div
          className="fixed inset-0 bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeLightbox}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-black hover:text-gray-300 transition z-50"
          >
            <X className="w-8 h-8" />
          </button>

          {/* 이전 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousPhoto();
            }}
            className="absolute left-4 text-black hover:text-gray-300 transition z-50"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          {/* 이미지 */}
          <div 
            className="max-w-4xl max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].imageUrl}
              alt={`${photos[lightboxIndex].uploaderName}님의 사진`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            
            {/* 이미지 정보 */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 bg-opacity-50 text-black px-4 py-2 rounded-full ${MODERN.text.small} text-center`}>
              <p className="font-semibold">{photos[lightboxIndex].uploaderName}</p>
              <p className={MODERN.text.caption}>{formatDate(photos[lightboxIndex].createdAt)}</p>
              <p className={`${MODERN.text.caption} mt-1`}>{lightboxIndex + 1} / {photos.length}</p>
            </div>
          </div>

          {/* 다음 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNextPhoto();
            }}
            className="absolute right-4 text-black hover:text-gray-300 transition z-50"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && photoToDelete && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${MODERN.text.subtitle} font-semibold text-gray-900`}>
                사진 삭제
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPhotoToDelete(null);
                  setDeletePassword('');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <img
                src={photoToDelete.imageUrl}
                alt="삭제할 사진"
                className="w-full h-48 object-cover rounded-lg"
              />
              <p className={`mt-2 ${MODERN.text.small} text-gray-600`}>
                업로더: {photoToDelete.uploaderName}
              </p>
            </div>

            <div className="mb-4">
              <label className={`block ${MODERN.text.small} font-medium text-gray-700 mb-2`}>
                비밀번호를 입력하세요
              </label>
              <input
                type="password"
                placeholder="••••"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${MODERN.text.small}`}
                autoFocus
              />
            </div>

            <p className={`${MODERN.text.small} text-gray-600 mb-4`}>
              업로드 시 설정한 비밀번호를 입력하면 삭제됩니다.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPhotoToDelete(null);
                  setDeletePassword('');
                }}
                className={`flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition ${MODERN.text.small} font-medium`}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className={`flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition ${MODERN.text.small} font-medium`}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Card 컴포넌트
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${MODERN.card} rounded-2xl shadow ${className}`}>{children}</div>;
}

// EllipseBadge 컴포넌트
function EllipseBadge({ text }: { text: string }) {
  return (
    <div className="flex justify-center">
      <svg width="180" height="50" viewBox="0 0 180 50">
        <ellipse cx="90" cy="25" rx="70" ry="16" fill="black" />
        <text
          x="50%"
          y="52%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontSize="13"
          fontWeight="520"
          letterSpacing="2"
        >
          {text}
        </text>
      </svg>
    </div>
  );
}