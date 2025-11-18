'use client'
import { Editor } from '@monaco-editor/react'

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  hasError?: boolean
  height?: string
}

export default function JsonEditor({ value, onChange, hasError = false, height = '260px' }: JsonEditorProps) {
  return (
    <div className={`rounded-md overflow-hidden border-2 ${hasError ? 'border-red-500' : 'border-gray-300'}`}>
      <Editor
        height={height}
        defaultLanguage="json"
        value={value}
        onChange={(newValue) => onChange(newValue || '')}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          wordWrap: 'on',
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
        }}
      />
    </div>
  )
}
