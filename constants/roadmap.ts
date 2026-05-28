export const phases = [
  {
    phase: 1,
    title: 'Core AI Chat',
    status: 'active',
    description: 'Natural language conversations, AI modes, conversation history, multi-language support',
    features: ['Natural conversations', 'AI personality modes', 'Conversation history', 'Multi-language support', 'Context-aware responses'],
  },
  {
    phase: 2,
    title: 'Voice Assistant & Wake Words',
    status: 'active',
    description: 'Wake word detection, voice commands, hands-free mode, custom wake words',
    features: ['Custom wake word', 'Multiple wake words', 'Voice training', 'Sensitivity settings', 'Hands-free mode', 'Continuous conversation'],
  },
  {
    phase: 3,
    title: 'Cross-App Assistant',
    status: 'development',
    description: 'Accessibility-based automation, messaging assistant, call assistant, cross-app navigation',
    features: ['Type text into apps', 'Fill forms', 'Draft messages', 'Answer/reject calls', 'Navigate apps', 'Caller announcement'],
  },
  {
    phase: 4,
    title: 'Media Intelligence',
    status: 'planned',
    description: 'Image analysis, video intelligence, screen understanding, OCR, object recognition',
    features: ['OCR text extraction', 'Object recognition', 'Video summaries', 'Scene recognition', 'Speech transcription', 'Screen understanding'],
  },
  {
    phase: 5,
    title: 'AI Agent System',
    status: 'planned',
    description: 'Multi-step task planning, autonomous execution, progress tracking, approval gates',
    features: ['Task decomposition', 'Action plans', 'Progress tracking', 'Approval gates', 'Trip planning', 'Project organization'],
  },
];

export const featureCategories = [
  { id: 'ai_chat', label: 'AI Chat', phase: 1, icon: 'MessageSquare' },
  { id: 'voice', label: 'Voice', phase: 2, icon: 'Mic' },
  { id: 'wake_word', label: 'Wake Word', phase: 2, icon: 'Radio' },
  { id: 'messaging', label: 'Messaging', phase: 3, icon: 'Mail' },
  { id: 'calls', label: 'Calls', phase: 3, icon: 'Phone' },
  { id: 'cross_app', label: 'Cross-App', phase: 3, icon: 'Smartphone' },
  { id: 'image_ai', label: 'Image AI', phase: 4, icon: 'Image' },
  { id: 'video_ai', label: 'Video AI', phase: 4, icon: 'Video' },
  { id: 'screen', label: 'Screen', phase: 4, icon: 'Monitor' },
  { id: 'agent', label: 'AI Agent', phase: 5, icon: 'Bot' },
  { id: 'productivity', label: 'Productivity', phase: 1, icon: 'CheckSquare' },
  { id: 'research', label: 'Research', phase: 1, icon: 'Search' },
];
