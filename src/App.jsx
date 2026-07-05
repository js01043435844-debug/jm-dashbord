import { useState, useEffect, useRef } from 'react';
import { Plus, X, Trash2, User, Flame, Award } from 'lucide-react';

const TYPE_CONFIG = {
  person: { label: '담당자', color: '#4A7AC9', bg: 'rgba(74,122,201,0.14)', Icon: User },
  brand: { label: '브랜드', color: '#D6402C', bg: 'rgba(214,64,44,0.14)', Icon: Flame },
  activity: { label: '활동', color: '#F2B705', bg: 'rgba(242,183,5,0.16)', Icon: Award },
};

const DEFAULT_CARDS = [
  { id: 'c1', name: '이종명 대표', type: 'person', todos: [
    { id: 't1', text: 'BNI Prima 위클리 자료 제출', done: false },
    { id: 't2', text: '양주 발주 소화기 서울 학교 배송 확인', done: true },
  ]},
  { id: 'c2', name: 'FIREVO', type: 'brand', todos: [
    { id: 't3', text: '디자인 소화기 신제품 목업 검토', done: false },
  ]},
  { id: 'c3', name: '독도소화기', type: 'brand', todos: [] },
  { id: 'c4', name: '닥터파이어', type: 'brand', todos: [
    { id: 't4', text: '이번 주 점검 일정 확정', done: false },
  ]},
  { id: 'c5', name: '유비무화', type: 'brand', todos: [] },
  { id: 'c6', name: 'BNI 프리마', type: 'activity', todos: [
    { id: 't5', text: 'Growth Director 월간 리포트 작성', done: false },
  ]},
  { id: 'c7', name: '코칭 · 성장', type: 'activity', todos: [
    { id: 't6', text: 'KAC 코칭 세션 준비', done: false },
  ]},
];

const STORAGE_KEY = 'jm-dashboard-cards-v1';
const uid = () => Math.random().toString(36).slice(2, 9);

function gaugePoint(cx, cy, r, angleDeg) {
  const rad = ((180 - angleDeg) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}
function gaugeArc(cx, cy, r, a1, a2) {
  const p1 = gaugePoint(cx, cy, r, a1);
  const p2 = gaugePoint(cx, cy, r, a2);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
}

function formatDateTime(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Dashboard() {
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('person');
  const [inputs, setInputs] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/cards');
        const data = await res.json();
        if (data) {
          setCards(data);
        } else {
          // 서버에 아직 데이터가 없으면, 이 브라우저에 남아있던 이전 로컬 데이터를 최초 시드로 사용
          let seed = DEFAULT_CARDS;
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) seed = JSON.parse(raw);
          } catch (e) {
            // 무시
          }
          setCards(seed);
        }
      } catch (e) {
        // 네트워크 실패 시 기본값 유지
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cards),
        });
      } catch (e) {
        console.error('저장 실패', e);
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [cards, loaded]);

  const totalTodos = cards.reduce((s, c) => s + c.todos.length, 0);
  const doneTodos = cards.reduce((s, c) => s + c.todos.filter((t) => t.done).length, 0);
  const percent = totalTodos === 0 ? 0 : Math.round((doneTodos / totalTodos) * 100);
  const gaugeAngle = (percent / 100) * 180;
  const needleRotation = gaugeAngle - 90;
  const zoneLabel = percent < 34 ? '점검필요' : percent < 67 ? '진행중' : '안전충전';
  const zoneColor = percent < 34 ? '#D6402C' : percent < 67 ? '#F2B705' : '#3FA34D';

  function addCard() {
    if (!newName.trim()) return;
    setCards([...cards, { id: uid(), name: newName.trim(), type: newType, todos: [] }]);
    setNewName('');
    setShowAdd(false);
  }
  function deleteCard(id) {
    setCards(cards.filter((c) => c.id !== id));
  }
  function addTodo(cardId) {
    const text = (inputs[cardId] || '').trim();
    if (!text) return;
    setCards(cards.map((c) => (c.id === cardId ? { ...c, todos: [...c.todos, { id: uid(), text, done: false, createdAt: Date.now(), doneAt: null }] } : c)));
    setInputs({ ...inputs, [cardId]: '' });
  }
  function toggleTodo(cardId, todoId) {
    setCards(cards.map((c) => (c.id === cardId ? { ...c, todos: c.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : null } : t)) } : c)));
  }
  function deleteTodo(cardId, todoId) {
    setCards(cards.map((c) => (c.id === cardId ? { ...c, todos: c.todos.filter((t) => t.id !== todoId) } : c)));
  }
  function saveRename(cardId) {
    if (editingName.trim()) {
      setCards(cards.map((c) => (c.id === cardId ? { ...c, name: editingName.trim() } : c)));
    }
    setEditingId(null);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1C1F22', color: '#F2EFE9', fontFamily: "'Noto Sans KR', sans-serif" }} className="p-4 sm:p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
        .brand-font { font-family: 'Black Han Sans', sans-serif; letter-spacing: 0.02em; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #3A3F44; border-radius: 3px; }
        .todo-scroll { max-height: 220px; overflow-y: auto; }
      `}</style>

      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame size={22} style={{ color: '#D6402C' }} />
            <span className="text-xs tracking-widest" style={{ color: '#9AA0A6' }}>SINCE 1997 · 소방외길</span>
          </div>
          <h1 className="brand-font text-3xl sm:text-4xl" style={{ color: '#F2EFE9' }}>JM시스템즈 통합 대시보드</h1>
          <p className="text-sm mt-1" style={{ color: '#9AA0A6' }}>담당자 · 브랜드 · 활동별 할 일을 한 화면에서 관리합니다</p>
        </div>

        {/* Gauge */}
        <div className="flex items-center gap-4 rounded-2xl px-5 py-4" style={{ background: '#262A2E', border: '1px solid #34393E' }}>
          <svg width="120" height="72" viewBox="0 0 120 72">
            <path d={gaugeArc(60, 62, 48, 0, 60)} stroke="#D6402C" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d={gaugeArc(60, 62, 48, 60, 120)} stroke="#F2B705" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d={gaugeArc(60, 62, 48, 120, 180)} stroke="#3FA34D" strokeWidth="10" fill="none" strokeLinecap="round" />
            <g style={{ transform: `rotate(${needleRotation}deg)`, transformOrigin: '60px 62px', transition: 'transform 0.5s ease' }}>
              <line x1="60" y1="62" x2="60" y2="20" stroke="#F2EFE9" strokeWidth="3" strokeLinecap="round" />
            </g>
            <circle cx="60" cy="62" r="5" fill="#F2EFE9" />
          </svg>
          <div>
            <div className="text-2xl font-bold" style={{ color: '#F2EFE9' }}>{percent}%</div>
            <div className="text-xs font-medium" style={{ color: zoneColor }}>{zoneLabel}</div>
            <div className="text-xs mt-0.5" style={{ color: '#9AA0A6' }}>{doneTodos}/{totalTodos} 완료</div>
          </div>
        </div>
      </div>

      {/* Add card */}
      <div className="max-w-6xl mx-auto mb-6">
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#262A2E', border: '1px dashed #4A4F54', color: '#F2EFE9' }}
          >
            <Plus size={16} /> 담당자 · 브랜드 · 활동 추가
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl" style={{ background: '#262A2E', border: '1px solid #34393E' }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCard()}
              placeholder="이름 입력 (예: 현장소장, FIREVO)"
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#1C1F22', border: '1px solid #3A3F44', color: '#F2EFE9' }}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#1C1F22', border: '1px solid #3A3F44', color: '#F2EFE9' }}
            >
              <option value="person">담당자</option>
              <option value="brand">브랜드</option>
              <option value="activity">활동</option>
            </select>
            <button onClick={addCard} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#D6402C', color: '#fff' }}>추가</button>
            <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg" style={{ color: '#9AA0A6' }}><X size={16} /></button>
          </div>
        )}
      </div>

      {/* Cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const cfg = TYPE_CONFIG[card.type];
          const Icon = cfg.Icon;
          const total = card.todos.length;
          const done = card.todos.filter((t) => t.done).length;
          const pct = total === 0 ? 0 : Math.round((done / total) * 100);
          return (
            <div key={card.id} className="rounded-2xl p-4 flex flex-col" style={{ background: '#262A2E', border: '1px solid #34393E' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 32, height: 32, background: cfg.bg, color: cfg.color }}>
                    <Icon size={16} />
                  </span>
                  {editingId === card.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveRename(card.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveRename(card.id)}
                      className="px-2 py-1 rounded text-sm outline-none min-w-0"
                      style={{ background: '#1C1F22', border: '1px solid #3A3F44', color: '#F2EFE9' }}
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingId(card.id); setEditingName(card.name); }}
                      className="text-left font-semibold text-sm truncate"
                      style={{ color: '#F2EFE9' }}
                      title="클릭해서 이름 수정"
                    >
                      {card.name}
                    </button>
                  )}
                </div>
                <button onClick={() => deleteCard(card.id)} className="p-1 rounded shrink-0" style={{ color: '#6B7176' }}>
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                <span className="text-[11px]" style={{ color: '#9AA0A6' }}>{done}/{total} 완료</span>
              </div>

              <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#1C1F22' }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 && total > 0 ? '#3FA34D' : cfg.color }} />
              </div>

              <div className="todo-scroll flex-1 space-y-1.5 mb-3">
                {card.todos.length === 0 && (
                  <p className="text-xs py-2" style={{ color: '#6B7176' }}>할 일이 없습니다</p>
                )}
                {card.todos.map((todo) => (
                  <div key={todo.id} className="flex items-start gap-2 group">
                    <button
                      onClick={() => toggleTodo(card.id, todo.id)}
                      className="w-4 h-4 mt-0.5 rounded shrink-0 flex items-center justify-center"
                      style={{ border: `1.5px solid ${todo.done ? '#3FA34D' : '#5A5F64'}`, background: todo.done ? '#3FA34D' : 'transparent' }}
                    >
                      {todo.done && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs block" style={{ color: todo.done ? '#6B7176' : '#E4E1DB', textDecoration: todo.done ? 'line-through' : 'none' }}>
                        {todo.text}
                      </span>
                      {(todo.createdAt || todo.doneAt) && (
                        <span className="text-[10px] block" style={{ color: '#5A5F64' }}>
                          {todo.createdAt && `입력 ${formatDateTime(todo.createdAt)}`}
                          {todo.done && todo.doneAt && ` · 완료 ${formatDateTime(todo.doneAt)}`}
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteTodo(card.id, todo.id)} className="opacity-0 group-hover:opacity-100 mt-0.5" style={{ color: '#6B7176' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  value={inputs[card.id] || ''}
                  onChange={(e) => setInputs({ ...inputs, [card.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addTodo(card.id)}
                  placeholder="할일 바로 입력..."
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: '#1C1F22', border: '1px solid #3A3F44', color: '#F2EFE9' }}
                />
                <button onClick={() => addTodo(card.id)} className="p-1.5 rounded-lg shrink-0" style={{ background: cfg.color, color: '#fff' }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="max-w-6xl mx-auto text-center text-[11px] mt-8" style={{ color: '#5A5F64' }}>
        모든 데이터는 자동 저장됩니다 · 카드 이름을 클릭하면 수정할 수 있습니다
      </p>
    </div>
  );
}
