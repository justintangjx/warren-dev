import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';

interface Props extends ViewProps {
  scroll?: boolean;
  className?: string;
}

export function Screen({ scroll, className, children, ...rest }: Props) {
  const Container: any = scroll ? ScrollView : View;
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Container
        className={cn('flex-1 px-4', className)}
        contentContainerClassName={scroll ? 'pb-8' : undefined}
        {...rest}>
        {children}
      </Container>
    </SafeAreaView>
  );
}
