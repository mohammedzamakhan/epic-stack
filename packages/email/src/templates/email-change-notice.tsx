import { Html, Container, Text, Head, Body } from '@react-email/components';

export interface EmailChangeNoticeEmailProps {
  userId: string;
}

export default function EmailChangeNoticeEmail({ userId }: EmailChangeNoticeEmailProps) {
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
            Your Epic Notes email has been changed
          </Text>
          <Text style={{ 
            fontSize: '16px', 
            lineHeight: '1.5',
            color: '#666666',
            marginBottom: '20px'
          }}>
            We're writing to let you know that your Epic Notes email has been
            changed.
          </Text>
          <Text style={{ 
            fontSize: '16px', 
            lineHeight: '1.5',
            color: '#666666',
            marginBottom: '20px'
          }}>
            If you changed your email address, then you can safely ignore this.
            But if you did not change your email address, then please contact
            support immediately.
          </Text>
          <Text style={{ 
            fontSize: '14px',
            color: '#888888'
          }}>
            Your Account ID: {userId}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

EmailChangeNoticeEmail.PreviewProps = {
  userId: 'user_123456789'
} as EmailChangeNoticeEmailProps;