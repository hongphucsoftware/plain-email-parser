import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Mail, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractedEvent {
  title: string;
  start: string;
  end: string;
  location?: string;
  confidence: number;
}

const EmailEventExtractor = () => {
  const [emailBody, setEmailBody] = useState("");
  const [extractedEvent, setExtractedEvent] = useState<ExtractedEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const extractEventFromEmail = (text: string): ExtractedEvent | null => {
    // Date patterns
    const datePatterns = [
      // "March 15, 2025", "March 15th, 2025"
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi,
      // "15/03/2025", "03/15/2025"
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
      // "2025-03-15"
      /(\d{4})-(\d{1,2})-(\d{1,2})/g,
      // "Monday, March 15"
      /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/gi
    ];

    // Time patterns
    const timePatterns = [
      // "3:00 PM", "15:00"
      /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/g,
      // "at 3pm", "at 15:00"
      /at\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/gi
    ];

    // Event title patterns
    const titlePatterns = [
      // "Meeting with...", "Call with..."
      /(meeting|call|conference|appointment|interview|lunch|dinner|presentation|demo|review)\s+(?:with\s+)?([^.\n]+)/gi,
      // "Team standup", "Project review"
      /(team\s+\w+|project\s+\w+|weekly\s+\w+|daily\s+\w+)/gi,
      // Subject line extraction
      /subject:\s*([^\n]+)/gi,
      // Event/meeting in quotes
      /"([^"]+)"/g
    ];

    // Location patterns
    const locationPatterns = [
      // "at 123 Main St", "in Conference Room A"
      /(?:at|in|location:)\s+([^.\n,]+(?:room|street|st|avenue|ave|building|floor|office)[^.\n,]*)/gi,
      // "Zoom meeting", "Teams call"
      /(zoom|teams|skype|google meet|webex)[^.\n,]*/gi
    ];

    let bestTitle = "";
    let bestDate = "";
    let bestTime = "";
    let bestLocation = "";
    let confidence = 0;

    // Extract date
    for (const pattern of datePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        bestDate = matches[0][0];
        confidence += 30;
        break;
      }
    }

    // Extract time
    for (const pattern of timePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        bestTime = matches[0][0];
        confidence += 25;
        break;
      }
    }

    // Extract title
    for (const pattern of titlePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        bestTitle = matches[0][1] || matches[0][0];
        confidence += 25;
        break;
      }
    }

    // Extract location
    for (const pattern of locationPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        bestLocation = matches[0][1] || matches[0][0];
        confidence += 20;
        break;
      }
    }

    // Fallback title extraction from first meaningful line
    if (!bestTitle) {
      const lines = text.split('\n').filter(line => line.trim().length > 5);
      if (lines.length > 0) {
        bestTitle = lines[0].replace(/^(subject:|re:|fwd:)/gi, '').trim();
        confidence += 10;
      }
    }

    // Default values if nothing found
    if (!bestTitle) bestTitle = "Extracted Event";
    if (!bestDate) bestDate = new Date().toISOString().split('T')[0];
    if (!bestTime) bestTime = "2:00 PM";

    // Parse and format datetime
    const parseDateTime = (date: string, time: string) => {
      try {
        const dateObj = new Date(date + ' ' + time);
        if (isNaN(dateObj.getTime())) {
          // Fallback parsing
          const now = new Date();
          const [hours, minutes] = time.match(/\d+/g) || ['14', '00'];
          const isPM = time.toLowerCase().includes('pm');
          let hour = parseInt(hours);
          if (isPM && hour !== 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;
          
          now.setHours(hour, parseInt(minutes), 0, 0);
          return now.toISOString();
        }
        return dateObj.toISOString();
      } catch {
        const now = new Date();
        now.setHours(14, 0, 0, 0);
        return now.toISOString();
      }
    };

    const startDateTime = parseDateTime(bestDate, bestTime);
    const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

    return {
      title: bestTitle.trim(),
      start: startDateTime,
      end: endDateTime,
      location: bestLocation.trim() || undefined,
      confidence: Math.min(confidence, 100)
    };
  };

  const handleExtractEvent = async () => {
    if (!emailBody.trim()) {
      toast({
        title: "No email content",
        description: "Please paste your email content to extract event details.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const event = extractEventFromEmail(emailBody);
      setExtractedEvent(event);
      setIsLoading(false);
      
      if (event) {
        toast({
          title: "Event extracted successfully!",
          description: `Found "${event.title}" with ${event.confidence}% confidence.`,
        });
      }
    }, 800);
  };

  const copyToClipboard = async () => {
    if (!extractedEvent) return;
    
    const jsonOutput = JSON.stringify(extractedEvent, null, 2);
    await navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copied to clipboard!",
      description: "Event JSON has been copied to your clipboard.",
    });
  };

  const exampleEmails = [
    {
      title: "Team Meeting",
      content: `Subject: Weekly Team Standup

Hi everyone,

We have our weekly team standup scheduled for Tuesday, March 15th at 2:00 PM in Conference Room A. We'll be discussing the quarterly goals and project updates.

Looking forward to seeing everyone there!

Best regards,
Sarah`
    },
    {
      title: "Client Call",
      content: `From: john@company.com
Subject: Call with ABC Corp

Hi team,

I've scheduled a call with ABC Corp for Friday, March 18th, 2025 at 10:30 AM. This will be a Zoom meeting to discuss the new partnership opportunities.

Zoom link: https://zoom.us/j/123456789

Thanks,
John`
    },
    {
      title: "Lunch Meeting",
      content: `Hey Sarah,

Would you like to grab lunch tomorrow (March 16th) at 12:30 PM? I was thinking we could meet at the new Italian restaurant on Main Street to discuss the marketing campaign.

Let me know if that works for you!

Mike`
    }
  ];

  const loadExample = (example: typeof exampleEmails[0]) => {
    setEmailBody(example.content);
    setExtractedEvent(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-primary to-primary-glow">
              <Mail className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Email Event Extractor
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your email content into structured calendar events using intelligent text parsing
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Content
              </CardTitle>
              <CardDescription>
                Paste your email content below to extract event information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your email content here..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="min-h-[200px] bg-muted/50"
              />
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleExtractEvent} 
                  disabled={isLoading}
                  variant="glow"
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Extract Event
                    </>
                  )}
                </Button>
              </div>

              {/* Example emails */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Try these examples:</h4>
                <div className="grid gap-2">
                  {exampleEmails.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => loadExample(example)}
                      className="justify-start text-left h-auto p-3"
                    >
                      <div>
                        <div className="font-medium">{example.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {example.content.split('\n')[0]}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-success" />
                Extracted Event
              </CardTitle>
              <CardDescription>
                Structured calendar event data extracted from your email
              </CardDescription>
            </CardHeader>
            <CardContent>
              {extractedEvent ? (
                <div className="space-y-6">
                  {/* Event Preview */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-success/10 to-primary/10 border border-success/20">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-foreground">
                          {extractedEvent.title}
                        </h3>
                        <Badge variant="secondary">
                          {extractedEvent.confidence}% confidence
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(extractedEvent.start).toLocaleDateString()} at{' '}
                          {new Date(extractedEvent.start).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        
                        {extractedEvent.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {extractedEvent.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* JSON Output */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">JSON Output</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="h-8"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    
                    <pre className="p-4 rounded-lg bg-muted text-sm overflow-auto max-h-48">
                      <code>{JSON.stringify(extractedEvent, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No event extracted yet</p>
                  <p className="text-sm">Paste email content and click "Extract Event" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailEventExtractor;