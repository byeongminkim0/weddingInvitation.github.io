import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, orderBy, query, limit, startAfter, Timestamp, QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db, type GuestbookMessage } from '../lib/firebase';
import { Edit2, Trash2, X, Loader2 } from 'lucide-react';

const MODERN = {
  card: "bg-white backdrop-blur-sm",
};

const MESSAGES_PER_PAGE = 10; // 한 번에 20개씩 로드

export function Guestbook() {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // 수정/삭제 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'edit' | 'delete'>('delete');
  const [selectedMessage, setSelectedMessage] = useState<GuestbookMessage | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  // 초기 메시지 로드
  async function loadMessages() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'guestbook'), 
        orderBy('createdAt', 'desc'),
        limit(MESSAGES_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      
      const loadedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        message: doc.data().message,
        passwordHash: doc.data().passwordHash,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setMessages(loadedMessages);
      
      // 마지막 문서 저장 (페이지네이션용)
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      // 더 불러올 메시지가 있는지 확인
      setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
    } catch (error) {
      console.error('메시지 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }

  // 더 많은 메시지 로드
  async function loadMoreMessages() {
    if (!lastDoc || !hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const q = query(
        collection(db, 'guestbook'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(MESSAGES_PER_PAGE)
      );
      
      const snapshot = await getDocs(q);
      
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        message: doc.data().message,
        passwordHash: doc.data().passwordHash,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setMessages(prev => [...prev, ...newMessages]);
      
      // 마지막 문서 업데이트
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      // 더 불러올 메시지가 있는지 확인
      setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
    } catch (error) {
      console.error('추가 메시지 로드 실패:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  // 비밀번호 해시 함수
  async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 메시지 제출
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('이름을 입력해주세요');
      return;
    }
    
    if (!message.trim()) {
      alert('메시지를 입력해주세요');
      return;
    }

    if (!password.trim()) {
      alert('비밀번호를 입력해주세요 (수정/삭제 시 필요)');
      return;
    }

    if (password.length < 4) {
      alert('비밀번호는 4자 이상 입력해주세요');
      return;
    }

    if (name.length > 20) {
      alert('이름은 20자 이내로 입력해주세요');
      return;
    }

    if (message.length > 500) {
      alert('메시지는 500자 이내로 입력해주세요');
      return;
    }

    try {
      setSubmitting(true);
      const passwordHash = await hashPassword(password);
      
      await addDoc(collection(db, 'guestbook'), {
        name: name.trim(),
        message: message.trim(),
        passwordHash: passwordHash,
        createdAt: Timestamp.now()
      });
      
      setName('');
      setMessage('');
      setPassword('');
      
      // 목록 새로고침
      await loadMessages();
      
      alert('메시지가 등록되었습니다!');
    } catch (error) {
      console.error('메시지 등록 실패:', error);
      alert('메시지 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  // 수정 모달 열기
  function openEditModal(msg: GuestbookMessage) {
    setSelectedMessage(msg);
    setModalType('edit');
    setModalName(msg.name);
    setModalMessage(msg.message);
    setModalPassword('');
    setShowModal(true);
  }

  // 삭제 모달 열기
  function openDeleteModal(msg: GuestbookMessage) {
    setSelectedMessage(msg);
    setModalType('delete');
    setModalPassword('');
    setShowModal(true);
  }

  // 모달 닫기
  function closeModal() {
    setShowModal(false);
    setSelectedMessage(null);
    setModalPassword('');
    setModalName('');
    setModalMessage('');
  }

  // 메시지 수정
  async function handleEdit() {
    if (!selectedMessage || !modalPassword.trim()) {
      alert('비밀번호를 입력해주세요');
      return;
    }

    if (!modalName.trim() || !modalMessage.trim()) {
      alert('이름과 메시지를 모두 입력해주세요');
      return;
    }

    try {
      const inputHash = await hashPassword(modalPassword);
      
      if (inputHash !== selectedMessage.passwordHash) {
        alert('비밀번호가 일치하지 않습니다');
        return;
      }

      const messageRef = doc(db, 'guestbook', selectedMessage.id);
      await updateDoc(messageRef, {
        name: modalName.trim(),
        message: modalMessage.trim(),
      });

      // 로컬 상태 업데이트 (전체 새로고침 대신)
      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessage.id 
          ? { ...msg, name: modalName.trim(), message: modalMessage.trim() }
          : msg
      ));

      closeModal();
      alert('메시지가 수정되었습니다');
    } catch (error) {
      console.error('메시지 수정 실패:', error);
      alert('메시지 수정에 실패했습니다');
    }
  }

  // 메시지 삭제
  async function handleDelete() {
    if (!selectedMessage || !modalPassword.trim()) {
      alert('비밀번호를 입력해주세요');
      return;
    }

    try {
      const inputHash = await hashPassword(modalPassword);
      
      if (inputHash !== selectedMessage.passwordHash) {
        alert('비밀번호가 일치하지 않습니다');
        return;
      }

      const messageRef = doc(db, 'guestbook', selectedMessage.id);
      await deleteDoc(messageRef);

      // 로컬 상태 업데이트 (전체 새로고침 대신)
      setMessages(prev => prev.filter(msg => msg.id !== selectedMessage.id));

      closeModal();
      alert('메시지가 삭제되었습니다');
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      alert('메시지 삭제에 실패했습니다');
    }
  }

  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  return (
    <>
      {/* 타이틀 */}
      <div className="text-center mb-6 sm:mb-8">
        <EllipseBadge text="GUESTBOOK" />
        <br />
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          방명록
        </h2>
        <p className="text-sm text-gray-600">
          축하의 마음을 전해주세요
        </p>
      </div>

      {/* 메시지 작성 폼 */}
      <Card className="p-5 sm:p-6 mb-6 sm:mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름
            </label>
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              축하 메시지
            </label>
            <textarea
              placeholder="결혼을 축하합니다!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none text-sm sm:text-base"
              disabled={submitting}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {message.length}/500
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호 <span className="text-xs text-gray-500">(수정/삭제 시 필요)</span>
            </label>
            <input
              type="password"
              placeholder="4자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {submitting ? '전송 중...' : '메시지 남기기'}
          </button>
        </form>
      </Card>

      {/* 메시지 목록 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm sm:text-base">메시지를 불러오는 중...</p>
        </div>
      ) : messages.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-gray-600 text-sm sm:text-base">
            첫 번째 축하 메시지를 남겨주세요!
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-3 sm:space-y-4">
            {messages.map((msg) => (
              <Card key={msg.id} className="p-5 sm:p-6 hover:shadow-md transition">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* 아바타 */}
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-base sm:text-lg">
                      {msg.name.charAt(0)}
                    </span>
                  </div>
                  
                  {/* 메시지 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {msg.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          {formatDate(msg.createdAt)}
                        </p>
                        {/* 수정/삭제 버튼 */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditModal(msg)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="수정"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(msg)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words">
                      {msg.message}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 더보기 버튼 */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMoreMessages}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium shadow-sm"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    불러오는 중...
                  </>
                ) : (
                  <>
                    더보기 ({MESSAGES_PER_PAGE}개씩)
                  </>
                )}
              </button>
            </div>
          )}

          {/* 메시지 개수 */}
          <div className="text-center mt-6 text-sm text-gray-500">
            {hasMore ? (
              <>현재 {messages.length}개의 메시지 (더보기로 추가 확인 가능)</>
            ) : (
              <>총 {messages.length}개의 축하 메시지</>
            )}
          </div>
        </>
      )}

      {/* 수정/삭제 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'edit' ? '메시지 수정' : '메시지 삭제'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="space-y-4">
              {modalType === 'edit' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름
                    </label>
                    <input
                      type="text"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      maxLength={20}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      메시지
                    </label>
                    <textarea
                      value={modalMessage}
                      onChange={(e) => setModalMessage(e.target.value)}
                      maxLength={500}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none text-sm"
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  정말 이 메시지를 삭제하시겠습니까?
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  placeholder="작성 시 입력한 비밀번호"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>

              {/* 모달 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={modalType === 'edit' ? handleEdit : handleDelete}
                  className={`flex-1 px-4 py-2 rounded-lg transition text-sm font-medium text-white ${
                    modalType === 'edit'
                      ? 'bg-black hover:bg-gray-800'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {modalType === 'edit' ? '수정' : '삭제'}
                </button>
              </div>
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