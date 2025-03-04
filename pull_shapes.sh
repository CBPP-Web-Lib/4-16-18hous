rsync -av \
  -e "/usr/bin/ssh" \
  --exclude "get_image_local.php" \
  cbppapps@vps42437.dreamhostps.com:/home/cbppapps/apps.cbpp.org/4-16-18hous_rev6-30-23/data/ ./webroot/data

rsync -av \
  -e "/usr/bin/ssh" \
  --exclude "get_image_local.php" \
  cbppapps@vps42437.dreamhostps.com:/home/cbppapps/apps.cbpp.org/4-16-18hous_rev6-30-23/topojson/ ./webroot/topojson