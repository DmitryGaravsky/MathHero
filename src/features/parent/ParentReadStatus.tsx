import { useApp } from "../../app/AppContext";

export function ParentReadStatus({ error }: { error?: boolean }) {
  const { t } = useApp();
  return <p role={error ? "alert" : "status"}>{t(error ? "parentReadError" : "loading")}</p>;
}
