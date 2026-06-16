import React from "react";
import { ExternalLink } from "lucide-react";

interface MarkdownOutputProps {
  content: string;
}

export function MarkdownOutput({ content }: MarkdownOutputProps) {
  if (!content) return null;

  // Split content by lines, identify paragraph blocks and tables
  const lines = content.split("\n");
  const parsedChildren: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check if it's a table row (starts/ends with | or has | inside)
    if (line.trim().startsWith("|") && lines[i + 1]?.trim().startsWith("|")) {
      // Collect all lines for this table
      const tableLines: string[] = [];
      const tableIdx = i;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      
      parsedChildren.push(renderTable(tableLines, `table-${tableIdx}`));
      continue;
    }

    // Headers
    if (line.trim().startsWith("###")) {
      const text = line.trim().substring(3).trim();
      parsedChildren.push(
        <h4 key={`h3-${i}`} className="text-sm font-semibold text-gray-800 mt-3 mb-1 font-sans flex items-center gap-1.5">
          {parseInline(text)}
        </h4>
      );
      i++;
      continue;
    }
    
    if (line.trim().startsWith("##")) {
      const text = line.trim().substring(2).trim();
      parsedChildren.push(
        <h3 key={`h2-${i}`} className="text-base font-semibold text-gray-900 mt-4 mb-2 font-sans border-b border-gray-100 pb-1 flex items-center gap-1.5">
          {parseInline(text)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.trim().startsWith("#")) {
      const text = line.trim().substring(1).trim();
      parsedChildren.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-gray-900 mt-4 mb-2 font-sans flex items-center gap-1.5">
          {parseInline(text)}
        </h2>
      );
      i++;
      continue;
    }

    // Lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const text = line.trim().substring(2).trim();
      parsedChildren.push(
        <ul key={`ul-${i}`} className="list-disc list-inside ml-2 my-1 text-xs text-gray-600 space-y-0.5 leading-relaxed">
          <li className="pl-1 list-none flex items-start gap-1.5">
            <span className="text-[10px] mt-1.5 text-indigo-500 font-bold">●</span>
            <span className="flex-1">{parseInline(text)}</span>
          </li>
        </ul>
      );
      i++;
      continue;
    }

    // Numbered List
    const numListMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numListMatch) {
      const num = numListMatch[1];
      const text = numListMatch[2].trim();
      parsedChildren.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside ml-2 my-1 text-xs text-gray-600 space-y-0.5 leading-relaxed">
          <li className="pl-1 list-none flex items-start gap-1.5">
            <span className="text-indigo-600 font-semibold text-xs min-w-[14px]">{num}.</span>
            <span className="flex-1">{parseInline(text)}</span>
          </li>
        </ol>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      const text = line.trim().substring(1).trim();
      parsedChildren.push(
        <blockquote key={`bq-${i}`} className="border-l-4 border-indigo-200 bg-indigo-50/50 px-3 py-1.5 rounded-r-md my-2 text-xs text-gray-600 italic">
          {parseInline(text)}
        </blockquote>
      );
      i++;
      continue;
    }

    // Regular line / Paragraph
    if (line.trim() !== "") {
      parsedChildren.push(
        <p key={`p-${i}`} className="text-xs text-gray-600 my-1 leading-relaxed">
          {parseInline(line)}
        </p>
      );
    } else {
      parsedChildren.push(<div key={`br-${i}`} className="h-1" />);
    }
    
    i++;
  }

  return <div className="space-y-1 font-sans text-gray-700">{parsedChildren}</div>;
}

// Function to parse links, bold tags inline
function parseInline(text: string): React.ReactNode {
  // Regex match for [label](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  // Regex match for **bold**
  const boldRegex = /\*\*([^*]+)\*\*/g;

  let elements: React.ReactNode[] = [];
  let lastIndex = 0;

  // Let's do a simple manual combined parse or sequential replacement
  // For simplicity, we can parse links first, and then within texts do bolding.
  let match;
  let keyIdx = 0;
  
  // Find all links
  const links: { start: number; end: number; label: string; url: string }[] = [];
  while ((match = linkRegex.exec(text)) !== null) {
    links.push({
      start: match.index,
      end: linkRegex.lastIndex,
      label: match[1],
      url: match[2],
    });
  }

  if (links.length === 0) {
    return parseBoldInline(text, keyIdx++);
  }

  for (const link of links) {
    // Add text before link
    if (link.start > lastIndex) {
      elements.push(parseBoldInline(text.substring(lastIndex, link.start), keyIdx++));
    }
    // Add link itself
    elements.push(
      <a
        key={`link-${keyIdx++}`}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5 font-medium transition-colors cursor-pointer"
        referrerPolicy="no-referrer"
      >
        {link.label}
        <ExternalLink size={10} className="inline opacity-80" />
      </a>
    );
    lastIndex = link.end;
  }

  if (lastIndex < text.length) {
    elements.push(parseBoldInline(text.substring(lastIndex), keyIdx++));
  }

  return <>{elements}</>;
}

function parseBoldInline(text: string, parentKey: number): React.ReactNode {
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIdx = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={`text-${parentKey}-${keyIdx++}`}>{text.substring(lastIndex, match.index)}</span>);
    }
    elements.push(
      <strong key={`bold-${parentKey}-${keyIdx++}`} className="font-semibold text-gray-900">
        {match[1]}
      </strong>
    );
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(<span key={`text-${parentKey}-${keyIdx++}`}>{text.substring(lastIndex)}</span>);
  }

  return elements.length > 0 ? <React.Fragment key={`bold-frag-${parentKey}`}>{elements}</React.Fragment> : text;
}

// Function to render Markdown Tables beautifully
function renderTable(lines: string[], key: string): React.ReactNode {
  // Parse rows
  const rawRows = lines.map(line => {
    // Split by | and filter out empty cells at outer margins
    const cells = line.split("|").map(c => c.trim());
    if (cells[0] === "") cells.shift();
    if (cells[cells.length - 1] === "") cells.pop();
    return cells;
  });

  if (rawRows.length === 0) return null;

  const headers = rawRows[0];
  // Check if second line is the separator (e.g., |---|---|)
  const hasSeparator = rawRows[1] && rawRows[1].every(cell => cell.startsWith("-") || cell === "");
  const dataRows = hasSeparator ? rawRows.slice(2) : rawRows.slice(1);

  return (
    <div key={key} className="overflow-x-auto my-3 border border-gray-100 rounded-lg shadow-xs max-w-full">
      <table className="min-w-full divide-y divide-gray-100 text-left text-xs bg-white">
        <thead className="bg-gray-50/70 font-medium text-gray-700">
          <tr>
            {headers.map((header, idx) => (
              <th key={`th-${idx}`} className="px-3 py-2 border-b border-gray-100 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                {parseInline(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-gray-600">
          {dataRows.map((row, rowIdx) => {
            // Highlight Grand Total or Total row
            const isTotalRow = row.some(cell => cell.toLowerCase().includes("total") || cell.includes("₹"));
            return (
              <tr
                key={`row-${rowIdx}`}
                className={`${isTotalRow ? "bg-indigo-50/20 font-medium text-gray-900" : "hover:bg-gray-50/40"}`}
              >
                {row.map((cell, cellIdx) => (
                  <td key={`cell-${cellIdx}`} className="px-3 py-1.5 whitespace-nowrap text-xs">
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
