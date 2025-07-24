import { Html, Container, Text, Head, Body, Section, Button } from "@react-email/components";

export interface OrganizationInviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
}

export default function OrganizationInviteEmail({ 
  inviteUrl, 
  organizationName, 
  inviterName 
}: OrganizationInviteEmailProps) {
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
              You're invited to join {organizationName}
            </Text>
            
            <Text style={{ 
              fontSize: '16px', 
              lineHeight: '1.5',
              color: '#666666',
              marginBottom: '20px'
            }}>
              {inviterName} has invited you to join <strong>{organizationName}</strong>. 
              Click the button below to accept the invitation and get started.
            </Text>
            
            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Button
                href={inviteUrl}
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
                Accept Invitation
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
              {inviteUrl}
            </Text>
            
            <Text style={{ 
              fontSize: '12px',
              color: '#999999',
              marginTop: '30px',
              borderTop: '1px solid #eee',
              paddingTop: '20px'
            }}>
              If you didn't expect this invitation, you can ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

OrganizationInviteEmail.PreviewProps = {
  inviteUrl: 'https://example.com/join/abc123',
  organizationName: 'Acme Corp',
  inviterName: 'John Doe'
} as OrganizationInviteEmailProps;