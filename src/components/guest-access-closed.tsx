import { Card, CardHeader } from "@/components/ui";

export function GuestAccessClosed() {
  return (
    <Card>
      <CardHeader
        title="이번 리더모임이 열려 있지 않습니다"
        subtitle="넣은 모임의 날이 지나면 교안, 배정모자, 공지를 볼 수 없습니다. 계정은 그대로 있습니다."
      />
    </Card>
  );
}
