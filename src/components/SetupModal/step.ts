export interface SetupConfig {
  ollamaEndpoint: string;
  mooMode: boolean;
}

export interface StepProps {
  config: SetupConfig;
  onChange: (patch: Partial<SetupConfig>) => void;
  onReadyChange: (ready: boolean) => void;
}

export interface Step {
  id: string;
  title: string;
  render: (props: StepProps) => React.ReactNode;
  validate?: (config: SetupConfig) => Promise<string | null>;
}
