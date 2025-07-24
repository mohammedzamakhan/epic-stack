import { Html, Container, Text, Head, Body, Section, Button } from "@react-email/components";

export interface TrialEndingEmailProps {
  portalUrl: string;
  userName?: string;
  daysRemaining?: number;
}

export default function TrialEndingEmail({ 
  portalUrl, 
  userName,
  daysRemaining = 3
}: TrialEndingEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f6f6f6' }}>
        <Container style={{ 
          maxWidth: '600px', 
          margin: '0 auto', 
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <Section>
            <Text style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              marginBottom: '20px',
              color: '#333333'
            }}>
              Trial Ending Soon
            </Text>
            
            <Text style={{ 
              fontSize: '16px', 
              lineHeight: '1.5',
              color: '#666666',
              marginBottom: '20px'
            }}>
              {userName ? `Hi ${userName}, ` : 'Hi there, '}
              your trial is ending in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. 
              To continue using our service without interruption, please manage your subscription below.
            </Text>
            
            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={portalUrl}
                style={{
                  backgroundColor: '#007bff',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                Manage Subscription
              </Button>
            </Section>
            
            <Text style={{ 
              fontSize: '14px',
              color: '#888888',
              marginTop: '20px'
            }}>
              If the button doesn't work, you can copy and paste this link into your browser:
            </Text>
            
            <Text style={{ 
              fontSize: '14px',
              color: '#007bff',
              wordBreak: 'break-all' as const
            }}>
              {portalUrl}
            </Text>
            
            <Text style={{ 
              fontSize: '12px',
              color: '#999999',
              marginTop: '30px',
              borderTop: '1px solid #eee',
              paddingTop: '20px'
            }}>
              Questions? Feel free to reach out to our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

TrialEndingEmail.PreviewProps = {
  portalUrl: 'https://billing.stripe.com/p/session/test_123',
  userName: 'John Doe',
  daysRemaining: 3
} as TrialEndingEmailProps;