-- candidate-documents bucket'ı önceden var olduğundan önceki migration'daki
-- insert ... on conflict do nothing boyut/mime kısıtlarını uygulamamıştı.
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where id = 'candidate-documents';
