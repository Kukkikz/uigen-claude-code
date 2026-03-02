"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { useFileSystem } from "@/lib/contexts/file-system-context";
import { Code2, AlertCircle } from "lucide-react";

export function CodeEditor() {
  const { selectedFile, getFileContent, updateFile } = useFileSystem();
  const editorRef = useRef<any>(null);
  const [editorError, setEditorError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loader.init().catch(() => {
      if (!cancelled) setEditorError(true);
    });
    return () => { cancelled = true; };
  }, []);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      updateFile(selectedFile, value);
    }
  };

  const getLanguageFromPath = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'md':
        return 'markdown';
      default:
        return 'plaintext';
    }
  };

  if (editorError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            Editor failed to load
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Check your network connection and reload the page
          </p>
        </div>
      </div>
    );
  }

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Code2 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Select a file to edit
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Choose a file from the file tree
          </p>
        </div>
      </div>
    );
  }

  const content = getFileContent(selectedFile) || '';
  const language = getLanguageFromPath(selectedFile);

  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        automaticLayout: true,
        wordWrap: 'on',
        padding: { top: 16, bottom: 16 },
      }}
    />
  );
}
