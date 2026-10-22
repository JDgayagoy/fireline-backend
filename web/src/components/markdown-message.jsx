'use client';

import React from 'react';

/**
 * Formats inline bold, italic, code, and highlighted values
 */
function formatInline(text) {
  if (!text) return null;

  const tokens = [];
  let key = 0;

  // Regex matches `code`, **bold**, *italic*
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      tokens.push(
        <code key={key++} className="px-1.5 py-0.5 rounded-md bg-zinc-200/80 text-zinc-900 font-mono text-[11px] font-semibold">
          {matchedStr.slice(1, -1)}
        </code>
      );
    } else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      tokens.push(
        <strong key={key++} className="font-bold text-zinc-950">
          {matchedStr.slice(2, -2)}
        </strong>
      );
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      tokens.push(
        <em key={key++} className="italic text-zinc-800">
          {matchedStr.slice(1, -1)}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.substring(lastIndex));
  }

  return tokens.length > 0 ? tokens : text;
}

export default function MarkdownMessage({ content, isUser = false }) {
  if (!content) return null;

  // For user messages, simple styled text
  if (isUser) {
    return <p className="leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  const rawLines = content.split('\n');
  const blocks = [];
  let currentList = null;

  rawLines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Empty line closes active list
    if (!trimmed) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      return;
    }

    // Check for Headers (###, ##, #)
    if (trimmed.startsWith('### ')) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      const title = trimmed.replace(/^###\s+/, '');
      const isDanger = title.includes('CRITICAL') || title.includes('DANGER') || title.includes('🚨');
      const isWarning = title.includes('WARNING') || title.includes('ADVISORY') || title.includes('⚠️');
      const isSafe = title.includes('SAFE') || title.includes('NORMAL') || title.includes('✅');

      let badgeClasses = 'text-zinc-950 bg-zinc-100 border-zinc-200';
      if (isDanger) badgeClasses = 'bg-red-50 text-red-700 border-red-200 shadow-xs';
      else if (isWarning) badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs';
      else if (isSafe) badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs';

      blocks.push(
        <div key={`h3-${idx}`} className={`p-2.5 rounded-xl border font-bold text-xs tracking-tight flex items-center gap-1.5 my-1.5 ${badgeClasses}`}>
          <span>{formatInline(title)}</span>
        </div>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      const title = trimmed.replace(/^##\s+/, '');
      blocks.push(
        <h3 key={`h2-${idx}`} className="text-sm font-bold text-zinc-950 mt-2 mb-1">
          {formatInline(title)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      const title = trimmed.replace(/^#\s+/, '');
      blocks.push(
        <h2 key={`h1-${idx}`} className="text-base font-bold text-zinc-950 mt-2.5 mb-1.5">
          {formatInline(title)}
        </h2>
      );
      return;
    }

    // Bullet lists: - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        if (currentList) blocks.push(currentList);
        currentList = { type: 'ul', key: `ul-${idx}`, items: [] };
      }
      currentList.items.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-zinc-800 my-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
          <span className="flex-1">{formatInline(bulletMatch[1])}</span>
        </li>
      );
      return;
    }

    // Numbered lists: 1. , 2.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        if (currentList) blocks.push(currentList);
        currentList = { type: 'ol', key: `ol-${idx}`, items: [] };
      }
      currentList.items.push(
        <li key={`oli-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-zinc-800 my-0.5">
          <span className="font-mono text-[10px] font-bold text-zinc-500 w-4 shrink-0 text-right">{numMatch[1]}.</span>
          <span className="flex-1">{formatInline(numMatch[2])}</span>
        </li>
      );
      return;
    }

    // Normal paragraph
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }

    blocks.push(
      <p key={`p-${idx}`} className="text-xs leading-relaxed text-zinc-800 my-1">
        {formatInline(trimmed)}
      </p>
    );
  });

  if (currentList) {
    blocks.push(currentList);
  }

  return (
    <div className="space-y-1">
      {blocks.map((block) => {
        if (block.type === 'ul') {
          return (
            <ul key={block.key} className="space-y-0.5 my-1.5 pl-0.5">
              {block.items}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={block.key} className="space-y-0.5 my-1.5 pl-0.5">
              {block.items}
            </ol>
          );
        }
        return block;
      })}
    </div>
  );
}
