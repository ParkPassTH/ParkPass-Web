import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SlotAvailabilityErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('SlotAvailability Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-2 bg-red-50 border border-red-200 rounded-lg min-h-[64px]">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs">{localStorage.getItem('language') === 'th' ? 'เกิดข้อผิดพลาดในการโหลดช่วงเวลา' : 'Error loading slot'}</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
