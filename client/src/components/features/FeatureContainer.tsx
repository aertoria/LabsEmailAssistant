import { BrainDump } from './BrainDump';
import { SmartReply } from './SmartReply';
import { ContextSynthesis } from './ContextSynthesis';
import { GmailControl } from './GmailControl';
import { ContactInsights } from './ContactInsights';

interface FeatureContainerProps {
  activeFeature: string | null;
}

export function FeatureContainer({ activeFeature }: FeatureContainerProps) {
  if (!activeFeature) return null;
  
  // Render the appropriate feature component based on the active feature
  switch(activeFeature) {
    case 'brain-dump':
      return <BrainDump />;
    case 'smart-reply':
      return <SmartReply />;
    case 'context-synthesis':
      return <ContextSynthesis />;
    case 'gmail-control':
      return <GmailControl />;
    case 'contact-insights':
      return <ContactInsights />;
    default:
      return null;
  }
}