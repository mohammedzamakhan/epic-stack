import { Trash2, Shield, User } from "lucide-react";
import { Form } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "#app/components/ui/avatar";
import { Badge } from "#app/components/ui/badge";
import { Button } from "#app/components/ui/button";
import { Card, CardContent } from "#app/components/ui/card";

interface OrganizationMember {
  userId: string;
  role: string;
  active: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: {
      id: string;
      altText: string | null;
    } | null;
  };
}

export function OrganizationMembers({ 
  members = [],
  currentUserId
}: { 
  members?: OrganizationMember[];
  currentUserId: string;
}) {
  if (members.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">No members found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={member.user.image ? `/resources/user-images/${member.user.image.id}` : undefined}
                    alt={member.user.image?.altText ?? member.user.name ?? member.user.email}
                  />
                  <AvatarFallback>
                    {(member.user.name ?? member.user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {member.user.name || member.user.email}
                    </span>
                    {member.userId === currentUserId && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  {member.user.name && (
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={member.role === 'admin' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {member.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                    {member.role === 'member' && <User className="h-3 w-3 mr-1" />}
                    {member.role}
                  </Badge>
                  
                  {member.userId !== currentUserId && (
                    <Form method="POST">
                      <input type="hidden" name="intent" value="remove-member" />
                      <input type="hidden" name="userId" value={member.userId} />
                      <Button 
                        type="submit" 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
