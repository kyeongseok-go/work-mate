'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, ChevronUp, ArrowRight, Sparkles } from 'lucide-react';
import { useFeatureStore } from '@/store/featureStore';
import { chatRooms } from '@/data/messages';
import { people } from '@/data/people';
import type { SearchResult, SearchSynthesis } from '@/app/api/search/route';

// Build a flat list of all messages with room/sender context for search
interface MessageWithContext {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  attachments?: { type: string; name: string; url?: string }[];
  roomId: string;
  roomName: string;
  senderName: string;
}

function buildAllMessages(): MessageWithContext[] {
  const personMap = new Map(people.map((p) => [p.id, p.name]));
  const result: MessageWithContext[] = [];

  for (const room of chatRooms) {
    for (const msg of room.messages) {
      result.push({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.timestamp,
        attachments: msg.attachments,
        roomId: room.id,
        roomName: room.name,
        senderName: personMap.get(msg.senderId) ?? msg.senderId,
      });
    }
  }

  return result;
}

// Keyword search: case-insensitive substring match across content, sender, room
function keywordSearch(query: string): MessageWithContext[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const personMap = new Map(people.map((p) => [p.id, p.name]));
  const results: MessageWithContext[] = [];

  for (const room of chatRooms) {
    for (const msg of room.messages) {
      const senderName = personMap.get(msg.senderId) ?? msg.senderId;
      const haystack = `${msg.content} ${senderName} ${room.name}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          id: msg.id,
          senderId: msg.senderId,
          content: msg.content,
          timestamp: msg.timestamp,
          attachments: msg.attachments,
          roomId: room.id,
          roomName: room.name,
          senderName,
        });
      }
    }
  }

  return results.slice(0, 20);
}

function highlightKeyword(text: string, keyword: string): string[] {
  if (!keyword.trim()) return [text];
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts;
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SUGGESTED_SEARCHES = [
  '최팀장이 결정한 마감일',
  '프로젝트A 관련 첨부파일',
  '이번 주 회의 일정',
  '김지원이 공유한 디자인',
];

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function RelevanceBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, #d1d5db ${0}%, #2563eb ${100}%)`,
          }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: '#2563eb' }}>
        {score}%
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
        <div className="h-4 w-12 bg-gray-100 rounded-full" />
        <div className="h-4 w-24 bg-gray-100 rounded-full ml-auto" />
      </div>
      <div className="h-4 w-full bg-gray-200 rounded mb-2" />
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-4" />
      <div className="h-1.5 w-full bg-gray-100 rounded-full" />
    </div>
  );
}

interface AIResultCardProps {
  result: SearchResult;
}

function AIResultCard({ result }: AIResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-5">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: '#eef4ff', color: '#2563eb' }}
          >
            {result.roomName}
          </span>
          <span className="text-xs text-gray-500 font-medium">{result.sender}</span>
          <span className="text-xs text-gray-400 ml-auto">{formatTimestamp(result.timestamp)}</span>
        </div>

        {/* Message content */}
        <p className="text-sm text-gray-800 leading-relaxed mb-3">{result.content}</p>

        {/* Matched semantic terms */}
        {result.matchedTerms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {result.matchedTerms.map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Rerank score bar (검색 품질 신호) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 shrink-0">재랭킹</span>
          <RelevanceBar score={result.rerankScore} />
          <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
            관련도 {result.relevance}
          </span>
        </div>

        {/* AI reasoning toggle */}
        <button
          className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <Sparkles size={12} style={{ color: '#2563eb' }} />
          <span>AI 판단</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {expanded && (
          <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
            {result.reasoning}
          </p>
        )}
      </div>

      {/* Footer: navigate to room */}
      <div className="border-t border-gray-50 px-5 py-3">
        <button
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          style={{ color: '#2563eb' }}
          onClick={() => router.push(`/chat/${result.roomId}`)}
        >
          원본 보기
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

interface SynthesisCardProps {
  synthesis: SearchSynthesis;
  results: SearchResult[];
}

function SynthesisCard({ synthesis, results }: SynthesisCardProps) {
  const router = useRouter();
  const byId = new Map(results.map((r) => [r.messageId, r]));

  return (
    <div
      className="rounded-2xl p-5 mb-5 border shadow-sm"
      style={{ background: 'linear-gradient(135deg, #eef4ff 0%, #ffffff 70%)', borderColor: '#bfdbfe' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={14} style={{ color: '#2563eb' }} />
        <span className="text-xs font-bold tracking-wide" style={{ color: '#2563eb' }}>
          AI 답변
        </span>
      </div>
      <p className="text-sm text-gray-800 leading-relaxed">{synthesis.text}</p>

      {synthesis.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-400">출처 {synthesis.citations.length}건:</span>
          {synthesis.citations.map((id, i) => {
            const r = byId.get(id);
            if (!r) return null;
            return (
              <button
                key={id}
                onClick={() => router.push(`/chat/${r.roomId}`)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                title={r.content}
              >
                [{i + 1}] {r.roomName} · {r.sender}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface KeywordResultCardProps {
  msg: MessageWithContext;
  keyword: string;
}

function KeywordResultCard({ msg, keyword }: KeywordResultCardProps) {
  const router = useRouter();
  const parts = highlightKeyword(msg.content, keyword);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-150 overflow-hidden">
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {msg.roomName}
          </span>
          <span className="text-xs text-gray-500">{msg.senderName}</span>
          <span className="text-xs text-gray-400 ml-auto">{formatTimestamp(msg.timestamp)}</span>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed">
          {parts.map((part, i) =>
            part.toLowerCase() === keyword.toLowerCase() ? (
              <mark key={i} className="rounded px-0.5" style={{ background: '#eef4ff', color: '#2563eb' }}>
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      </div>
      <div className="border-t border-gray-50 px-4 py-2.5">
        <button
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          onClick={() => router.push(`/chat/${msg.roomId}`)}
        >
          채팅방 이동
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function SearchPage() {
  const { features } = useFeatureStore();
  const isAI = features.semanticSearch;

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResults, setAiResults] = useState<SearchResult[] | null>(null);
  const [synthesis, setSynthesis] = useState<SearchSynthesis | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [keywordResults, setKeywordResults] = useState<MessageWithContext[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      if (!q) return;

      setLastQuery(q);
      setError(null);

      if (!isAI) {
        // Keyword mode — instant, no loading needed
        const results = keywordSearch(q);
        setKeywordResults(results);
        setAiResults(null);
        setSynthesis(null);
        setInterpretation(null);
        return;
      }

      // AI semantic mode
      setIsLoading(true);
      setAiResults(null);
      setKeywordResults(null);
      setSynthesis(null);
      setInterpretation(null);

      try {
        const allMessages = buildAllMessages();
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, messages: allMessages }),
        });

        const json = await response.json();

        if (!json.success) {
          throw new Error(json.error ?? '검색 중 오류가 발생했습니다.');
        }

        setAiResults((json.data ?? []) as SearchResult[]);
        setSynthesis((json.synthesizedAnswer as SearchSynthesis | undefined) ?? null);
        setInterpretation((json.queryInterpretation as string | undefined) ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    [isAI]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const showEmpty = !isLoading && aiResults === null && keywordResults === null && !error;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <Search size={20} className="text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">검색</h1>
      </div>

      {/* Search input */}
      <div className="mb-2">
        <div
          className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border shadow-sm transition-shadow focus-within:shadow-md"
          style={{ borderColor: isAI ? '#2563eb' : '#e5e7eb' }}
        >
          {isAI ? (
            <Sparkles size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
          ) : (
            <Search size={16} className="text-gray-400 shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAI
                ? '자연어로 검색하세요 (예: 지난 달 김지원이 공유한 디자인 시안)'
                : '채팅, 파일, 멤버 검색...'
            }
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
          {query && (
            <button
              onClick={() => handleSearch(query)}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: '#2563eb' }}
            >
              검색
            </button>
          )}
        </div>

        {isAI && (
          <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            AI 의미 검색 활성화됨 — Claude가 메시지 의미를 분석합니다
          </p>
        )}
      </div>

      {/* Suggested searches (when input is empty and AI mode) */}
      {isAI && showEmpty && (
        <div className="mb-8 mt-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">추천 검색어</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-sm px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Sparkles size={12} style={{ color: '#2563eb' }} />
            Claude가 관련 메시지를 분석 중입니다...
          </p>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* AI results */}
      {!isLoading && isAI && aiResults !== null && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">&ldquo;{lastQuery}&rdquo;</span> 검색 결과{' '}
              {aiResults.length}개
            </p>
            {interpretation && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                해석: {interpretation}
              </span>
            )}
          </div>

          {synthesis && synthesis.text && (
            <SynthesisCard synthesis={synthesis} results={aiResults} />
          )}

          {aiResults.length === 0 ? (
            <EmptyResults query={lastQuery} />
          ) : (
            <div className="space-y-4">
              {aiResults.map((r) => (
                <AIResultCard key={r.messageId} result={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Keyword results */}
      {!isLoading && !isAI && keywordResults !== null && (
        <div className="mt-6">
          <p className="text-xs text-gray-500 mb-4">
            <span className="font-semibold text-gray-700">&ldquo;{lastQuery}&rdquo;</span> 검색 결과{' '}
            {keywordResults.length}개
          </p>
          {keywordResults.length === 0 ? (
            <EmptyResults query={lastQuery} />
          ) : (
            <div className="space-y-3">
              {keywordResults.map((m) => (
                <KeywordResultCard key={m.id} msg={m} keyword={lastQuery} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state (no search yet) */}
      {showEmpty && !isAI && (
        <div className="text-center py-16 text-gray-400">
          <Search size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">검색어를 입력하세요</p>
          <p className="text-xs mt-1 opacity-70">채팅 메시지, 파일, 멤버를 검색할 수 있습니다</p>
        </div>
      )}
    </div>
  );
}

function EmptyResults({ query }: { query: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <Search size={36} className="mx-auto mb-3 opacity-20" />
      <p className="text-sm font-medium text-gray-600">
        &ldquo;{query}&rdquo;에 대한 결과를 찾지 못했어요
      </p>
      <p className="text-xs mt-1 text-gray-400">다른 검색어로 시도해보세요</p>
    </div>
  );
}
