import { Html, Container, Text, Link, Head, Body, Button, Section } from '@react-email/components';

export interface ForgotPasswordEmailProps {
  onboardingUrl: string;
  otp: string;
}

export default function ForgotPasswordEmail({
  onboardingUrl,
  otp,
}: ForgotPasswordEmailProps) {
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
          <Text style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#333333'
          }}>
            Epic Notes Password Reset
          </Text>
          <Text style={{ 
            fontSize: '16px', 
            lineHeight: '1.5',
            color: '#666666',
            marginBottom: '20px'
          }}>
            Here's your verification code: <strong>{otp}</strong>
          </Text>
          <Text style={{ 
            fontSize: '16px', 
            lineHeight: '1.5',
            color: '#666666',
            marginBottom: '20px'
          }}>
            Or click the button below to reset your password:
          </Text>
          <Section style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button
              href={onboardingUrl}
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
              Reset Password
            </Button>
          </Section>
          <Text style={{ 
            fontSize: '14px',
            color: '#888888'
          }}>
            If the button doesn't work, you can copy and paste this link: {onboardingUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

ForgotPasswordEmail.PreviewProps = {
  onboardingUrl: 'https://example.com/verify/abc123',
  otp: '123456'
} as ForgotPasswordEmailProps;