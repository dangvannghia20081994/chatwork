#!/bin/sh
set -eu

project_dir=/workspace/rezil-esms
openapi_dir="$project_dir/etc/openapi"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

mkdir -p "$tmp_dir/openapi"
cp -R "$openapi_dir/." "$tmp_dir/openapi/"

cd "$tmp_dir/openapi"

# Keep source YAML files untouched. These local key renames avoid Redocly
# component-name collisions while preserving the actual parameter names.
sed -i 's/^userId:/resetPasswordUserId:/' components/parameters/UsersResetPassword.yaml
sed -i "s|UsersResetPassword.yaml#/userId|UsersResetPassword.yaml#/resetPasswordUserId|" paths/users-reset-password.yaml

sed -i 's/^id:/groupKeyword:/' components/parameters/UserGroupParams.yaml
sed -i "s|UserGroupParams.yaml#/id|UserGroupParams.yaml#/groupKeyword|" paths/dropdown/group-dropdown.yaml

rm -fR "$openapi_dir/dist"
rm -fR "$project_dir/app/src/lib/api/defs"

redocly bundle openapi.yaml -o .openapi.yaml
openapi2aspida -i .openapi.yaml -o "$project_dir/app/src/lib/api/defs"
