export const CODE_LANGUAGES = [
  { value: 'plain', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'json', label: 'JSON' },
  { value: 'markup', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'bash', label: 'Shell / Bash' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'groovy', label: 'Groovy' },
  { value: 'sql', label: 'SQL' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'docker', label: 'Dockerfile' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'http', label: 'HTTP' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'ini', label: 'INI / properties' },
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number]['value'];
