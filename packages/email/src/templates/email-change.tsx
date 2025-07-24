import { Html, Container, Text, Link, Head, Body } from '@react-email/components';

export interface EmailChangeEmailProps {
  verifyUrl: string;
  otp: string;
}

export default function EmailChangeEmail({
  verifyUrl,
  otp,
}: EmailChangeEmailProps) {
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
            Epic Notes Email Change
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
            marginBottom: '10px'
          }}>
            Or click the link:
          </Text>
          <Link href={verifyUrl} style={{ color: '#007bff' }}>{verifyUrl}</Link>
        </Container>
      </Body>
    </Html>
  );
}

EmailChangeEmail.PreviewProps = {
  verifyUrl: 'https://example.com/verify/abc123',
  otp: '123456'
} as EmailChangeEmailProps;