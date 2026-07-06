#!/bin/sh
set -eu

project_dir=/workspace/rezil-esms-mobile
openapi_dir="$project_dir/etc/openapi"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

mkdir -p "$tmp_dir/openapi"
cp -R "$openapi_dir/." "$tmp_dir/openapi/"

cd "$tmp_dir/openapi"

# Keep source YAML files untouched. These local key renames avoid Redocly
# component-name collisions while preserving the actual parameter names.
sed -i 's/^siteLocationId:/equipmentBySafetySiteLocationId:/; s/^safetyEquipmentId:/equipmentBySafetySafetyEquipmentId:/' components/parameters/EquipmentBySafetyDropdownParams.yaml
sed -i "s|EquipmentBySafetyDropdownParams.yaml#/siteLocationId|EquipmentBySafetyDropdownParams.yaml#/equipmentBySafetySiteLocationId|; s|EquipmentBySafetyDropdownParams.yaml#/safetyEquipmentId|EquipmentBySafetyDropdownParams.yaml#/equipmentBySafetySafetyEquipmentId|" paths/dropdown/equipment-by-safety-dropdown.yaml

sed -i 's/^id:/planId:/; s/^procedureId:/planProcedureId:/' components/parameters/PlanProcedureDeleteParams.yaml
sed -i "s|PlanProcedureDeleteParams.yaml#/id|PlanProcedureDeleteParams.yaml#/planId|; s|PlanProcedureDeleteParams.yaml#/procedureId|PlanProcedureDeleteParams.yaml#/planProcedureId|" paths/inspectionPlan/procedure/delete.yaml

sed -i 's/^id:/inspectionReportId:/' components/parameters/InspectionReportDetailParams.yaml
sed -i "s|InspectionReportDetailParams.yaml#/id|InspectionReportDetailParams.yaml#/inspectionReportId|" paths/inspection/live/inspection-report-detail.yaml

sed -i 's/^id:/inspectionExecuteId:/' components/parameters/InspectionExecuteParams.yaml
sed -i "s|InspectionExecuteParams.yaml#/id|InspectionExecuteParams.yaml#/inspectionExecuteId|" paths/inspection/live/inspection-execute.yaml paths/inspection/execute/inspection-execute-download-room.yaml paths/inspection/execute/inspection-execute-upload.yaml paths/inspection/execute/inspection-execute-download-master.yaml

sed -i 's/^inspectionId:/remarkListInspectionId:/; s/^limit:/remarkListLimit:/; s/^offset:/remarkListOffset:/' components/parameters/RemarkListParams.yaml
sed -i "s|RemarkListParams.yaml#/inspectionId|RemarkListParams.yaml#/remarkListInspectionId|; s|RemarkListParams.yaml#/limit|RemarkListParams.yaml#/remarkListLimit|; s|RemarkListParams.yaml#/offset|RemarkListParams.yaml#/remarkListOffset|" paths/inspection/live/remark/remark-list.yaml

sed -i 's/^id:/inspectionRemarkId:/' components/parameters/InspectionRemarkUpdateParams.yaml
sed -i "s|InspectionRemarkUpdateParams.yaml#/id|InspectionRemarkUpdateParams.yaml#/inspectionRemarkId|" paths/inspection/live/remark/remark-update.yaml

sed -i 's/^siteLocationId:/safetyEquipmentSiteLocationId:/' components/parameters/SafetyEquipmentDropdownParams.yaml
sed -i "s|SafetyEquipmentDropdownParams.yaml#/siteLocationId|SafetyEquipmentDropdownParams.yaml#/safetyEquipmentSiteLocationId|" paths/dropdown/safety-equipment-dropdown.yaml

sed -i 's/^id:/inspectionExecuteCheckId:/; s/^siteLocationId:/inspectionExecuteCheckSiteLocationId:/' components/parameters/InspectionExecuteCheckParams.yaml
sed -i "s|InspectionExecuteCheckParams.yaml#/id|InspectionExecuteCheckParams.yaml#/inspectionExecuteCheckId|" paths/inspection/execute/inspection-execute-check-master.yaml paths/inspection/execute/inspection-execute-check-room.yaml
sed -i "s|InspectionExecuteCheckParams.yaml#/siteLocationId|InspectionExecuteCheckParams.yaml#/inspectionExecuteCheckSiteLocationId|" paths/inspection/execute/inspection-execute-check-room.yaml

sed -i 's/^id:/inspectionReportUpdateId:/' components/parameters/InspectionReportUpdateParams.yaml
sed -i "s|InspectionReportUpdateParams.yaml#/id|InspectionReportUpdateParams.yaml#/inspectionReportUpdateId|" paths/inspection/live/report-submit.yaml paths/inspection/live/report-update.yaml

rm -fR "$openapi_dir/dist"
rm -fR "$project_dir/app/src/lib/api/defs"

redocly bundle openapi.yaml -o .openapi.yaml
openapi2aspida -i .openapi.yaml -o "$project_dir/app/src/lib/api/defs"
