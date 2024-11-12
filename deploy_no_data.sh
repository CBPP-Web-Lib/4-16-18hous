rsync -av \
  -e "/usr/bin/ssh" \
  --exclude "get_image_local.php" \
  ./webroot/ cbppapps@vps42437.dreamhostps.com:/home/cbppapps/apps.cbpp.org/4-16-18hous_rev6-30-23/

rsync -av \
  -e "/usr/bin/ssh" \
  --exclude webroot/data \
  --exclude webroot/topojson \
  ./node/prod/ cbppapps@vps42437.dreamhostps.com:/home/cbppapps/apps.cbpp.org/4-16-18hous_rev6-30-23/js/
