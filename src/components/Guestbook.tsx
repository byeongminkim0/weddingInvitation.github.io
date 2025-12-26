import { useState, useEffect, type FormEvent } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  orderBy,
  query,
  limit,
  startAfter,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { db, type GuestbookMessage } from '../lib/firebase';
import { Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { EllipseBadge } from '../ModernWeddingInvite';

const MODERN = {
  card: 'bg-white backdrop-blur-sm',
};

const MESSAGES_PER_PAGE = 10;

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

  // ✅ 추가: 초기에는 작성폼 숨김 / 글 1개만 보기
  const [showComposer, setShowComposer] = useState(false); // 작성하기
  const [showAll, setShowAll] = useState(false); // 전체보기

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

      const loadedMessages = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        message: d.data().message,
        passwordHash: d.data().passwordHash,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));

      setMessages(loadedMessages);

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
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

      const newMessages = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        message: d.data().message,
        passwordHash: d.data().passwordHash,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));

      setMessages((prev) => [...prev, ...newMessages]);

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
    } catch (error) {
      console.error('추가 메시지 로드 실패:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  // 비밀번호 해시
  async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 메시지 제출
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!name.trim()) return alert('이름을 입력해주세요');
    if (!message.trim()) return alert('메시지를 입력해주세요');
    if (!password.trim()) return alert('비밀번호를 입력해주세요 (수정/삭제 시 필요)');
    if (password.length < 4) return alert('비밀번호는 4자 이상 입력해주세요');
    if (name.length > 20) return alert('이름은 20자 이내로 입력해주세요');
    if (message.length > 500) return alert('메시지는 500자 이내로 입력해주세요');

    try {
      setSubmitting(true);
      const passwordHash = await hashPassword(password);

      await addDoc(collection(db, 'guestbook'), {
        name: name.trim(),
        message: message.trim(),
        passwordHash,
        createdAt: Timestamp.now(),
      });

      setName('');
      setMessage('');
      setPassword('');

      await loadMessages();

      // ✅ 작성 후에는 작성폼 닫고, 최신 1개 보여주는 기본 화면으로 복귀
      setShowComposer(false);
      setShowAll(false);

      alert('메시지가 등록되었습니다!');
    } catch (error) {
      console.error('메시지 등록 실패:', error);
      alert('메시지 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(msg: GuestbookMessage) {
    setSelectedMessage(msg);
    setModalType('edit');
    setModalName(msg.name);
    setModalMessage(msg.message);
    setModalPassword('');
    setShowModal(true);
  }

  function openDeleteModal(msg: GuestbookMessage) {
    setSelectedMessage(msg);
    setModalType('delete');
    setModalPassword('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedMessage(null);
    setModalPassword('');
    setModalName('');
    setModalMessage('');
  }

  async function handleEdit() {
    if (!selectedMessage || !modalPassword.trim()) return alert('비밀번호를 입력해주세요');
    if (!modalName.trim() || !modalMessage.trim()) return alert('이름과 메시지를 모두 입력해주세요');

    try {
      const inputHash = await hashPassword(modalPassword);
      if (inputHash !== selectedMessage.passwordHash) return alert('비밀번호가 일치하지 않습니다');

      const messageRef = doc(db, 'guestbook', selectedMessage.id);
      await updateDoc(messageRef, {
        name: modalName.trim(),
        message: modalMessage.trim(),
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMessage.id ? { ...m, name: modalName.trim(), message: modalMessage.trim() } : m))
      );

      closeModal();
      alert('메시지가 수정되었습니다');
    } catch (error) {
      console.error('메시지 수정 실패:', error);
      alert('메시지 수정에 실패했습니다');
    }
  }

  async function handleDelete() {
    if (!selectedMessage || !modalPassword.trim()) return alert('비밀번호를 입력해주세요');

    try {
      const inputHash = await hashPassword(modalPassword);
      if (inputHash !== selectedMessage.passwordHash) return alert('비밀번호가 일치하지 않습니다');

      const messageRef = doc(db, 'guestbook', selectedMessage.id);
      await deleteDoc(messageRef);

      setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));

      closeModal();
      alert('메시지가 삭제되었습니다');
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      alert('메시지 삭제에 실패했습니다');
    }
  }

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  }

  // ✅ 보여줄 메시지: 기본은 1개, 전체보기면 전부
  const visibleMessages = showAll ? messages : messages.slice(0, 1);

  return (
    <>
      {/* 타이틀 */}
      <div className="text-center mb-6 sm:mb-8">
        <EllipseBadge text="THANK U" />
        <div className="text-center text-neutral-900 text-2xl font-normal font-['Gabia_Gosran']">방명록</div>
      </div>

      {/* 메시지 목록 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm sm:text-base">메시지를 불러오는 중...</p>
        </div>
      ) : messages.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-gray-600 text-sm sm:text-base">첫 번째 축하 메시지를 남겨주세요!</p>
        </Card>
      ) : (
        <>
          <div className="space-y-3 sm:space-y-4">
            {visibleMessages.map((msg) => (
              <Card key={msg.id} className="pl-3 pt-3 pr-3 pb-2 hover:shadow-md transition">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-base sm:text-lg">{msg.name.charAt(0)}</span>
                  </div> */}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-blue-500 text-base font-['Pretendard'] leading-6">{msg.name}</p>
                        <p className="text-neutral-400 text-xs font-normal font-['Pretendard'] leading-4">{formatDate(msg.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words">
                      {msg.message}
                    </p>
                    <div className="flex justify-end items-center gap-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(msg)}
                          className="p-1.5 text-black  hover:text-blue-600 rounded transition"
                          title="수정"
                        >
                          <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(msg)}
                          className="p-1.5 text-black hover:text-blue-600 rounded transition"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* ✅ 전체보기일 때만 더보기/개수 표시 */}
          {showAll && hasMore && (
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
                  <>더보기 ({MESSAGES_PER_PAGE}개씩)</>
                )}
              </button>
            </div>
          )}

          {showAll && (
            <div className="text-center mt-6 text-sm text-gray-500">
              {hasMore ? <>현재 {messages.length}개의 메시지 (더보기로 추가 확인 가능)</> : <>총 {messages.length}개의 축하 메시지</>}
            </div>
          )}
        </>
      )}

      {/* ✅ 하단 버튼 바: 왼쪽 전체보기 / 오른쪽 작성하기 (버튼 스타일 통일) */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          disabled={messages.length <= 1}
          className="min-w-[120px] inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-900 shadow-sm hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showAll ? '접기' : '전체보기'}
        </button>

        <button
          type="button"
          onClick={() => setShowComposer(true)} // ✅ 모달 오픈
          className="min-w-[120px] inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-900 shadow-sm hover:bg-gray-50 transition"
        >
          작성하기
        </button>
      </div>


      {/* ✅ 작성 모달 */}
      {showComposer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowComposer(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => setShowComposer(false)}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="text-center mb-6 sm:mb-8">
                <EllipseBadge text="THANK U" />
                <div className="text-center text-neutral-900 text-2xl font-normal font-['Gabia_Gosran']">방명록</div>
              </div>
              <div className="text-center justify-start text-neutral-900 text-lg font-normal font-['Gabia_Gosran']">방명록을 작성해주세요</div>
              <div>
                <input
                  type="text"
                  placeholder="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                  disabled={submitting}
                />
              </div>
              <div>
                <textarea
                  placeholder="내용을 입력해주세요"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none text-sm"
                  disabled={submitting}
                />
                {/* <div className="text-right text-xs text-gray-500 mt-1">{message.length}/500</div> */}
              </div>
              <div>
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                  disabled={submitting}
                />
              </div>

              {/* 버튼 */}
              <div className="flex justify-end">
                {/* <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                  disabled={submitting}
                >
                  취소
                </button> */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-28 h-6 bg-white rounded shadow-[2px_2px_5.400000095367432px_0px_rgba(0,0,0,0.27)] transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {submitting ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* 수정/삭제 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'edit' ? '메시지 수정' : '메시지 삭제'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {modalType === 'edit' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                    <input
                      type="text"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      maxLength={20}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">메시지</label>
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
                <p className="text-sm text-gray-600">정말 이 메시지를 삭제하시겠습니까?</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                <input
                  type="password"
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  placeholder="작성 시 입력한 비밀번호"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={modalType === 'edit' ? handleEdit : handleDelete}
                  className={`flex-1 px-4 py-2 rounded-lg transition text-sm font-medium text-white ${modalType === 'edit' ? 'bg-black hover:bg-gray-800' : 'bg-red-500 hover:bg-red-600'
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

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`${MODERN.card} rounded-2xl shadow ${className}`}>{children}</div>;
}
