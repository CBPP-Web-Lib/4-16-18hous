rsync -av \
  -e "/usr/bin/ssh" \
  --exclude "get_stamen.php" \
  ./webroot/ cbppapps@apps.cbpp.org:/home/cbppapps/apps.cbpp.org/4-16-18hous_rev6-30-23/

rsync -av \
  -e "/usr/bin/ssh" \
  ./node/prod/ cbppapps@apps.cbpp.org:/home/cbppapps/apps.cbpp.org/4-16-18hous_rev6-30-23/js/
