function inlineMarkdown(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

export function MarkdownPreview({ markdown }: { markdown: string }) {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc pl-5 space-y-1">
        {listItems.map((item, index) => (
          <li key={index} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
        ))}
      </ul>
    );
    listItems = [];
  };

  const flushCode = () => {
    if (codeLines.length === 0) return;
    elements.push(
      <pre key={`code-${elements.length}`} className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
    codeLines = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      elements.push(<h3 key={`h3-${elements.length}`} className="text-lg font-semibold mt-4">{line.slice(4)}</h3>);
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(<h2 key={`h2-${elements.length}`} className="text-xl font-semibold mt-5">{line.slice(3)}</h2>);
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      elements.push(<h1 key={`h1-${elements.length}`} className="text-2xl font-bold">{line.slice(2)}</h1>);
      continue;
    }

    if (/^- /.test(line)) {
      listItems.push(line.slice(2));
      continue;
    }

    if (/^\d+\. /.test(line)) {
      listItems.push(line.replace(/^\d+\. /, ""));
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      flushList();
      elements.push(
        <pre key={`table-${elements.length}`} className="overflow-x-auto rounded-md bg-muted/60 p-3 text-xs">
          {line}
        </pre>
      );
      continue;
    }

    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="leading-7" dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
    );
  }

  flushList();
  flushCode();

  return <div className="prose prose-sm max-w-none space-y-3 dark:prose-invert">{elements}</div>;
}
