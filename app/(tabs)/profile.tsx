import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/providers/auth';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const email = session?.user.email ?? 'Not signed in';

  return (
    <Screen scroll>
      <View className="py-4">
        <Text variant="title">Profile</Text>
      </View>
      <Card>
        <Text variant="muted">Signed in as</Text>
        <Text variant="heading" className="mt-1">{email}</Text>
        <Button
          label="Sign out"
          variant="outline"
          className="mt-4"
          onPress={() => signOut()}
        />
      </Card>
    </Screen>
  );
}
