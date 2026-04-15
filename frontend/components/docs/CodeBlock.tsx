interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language = 'typescript', children }: CodeBlockProps) {
  return (
    <pre>
      <code 
        className={`language-${language}`}
        dangerouslySetInnerHTML={{ __html: children }}
      />
    </pre>
  );
}
