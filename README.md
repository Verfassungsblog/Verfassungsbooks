# Verfassungsbooks
Verfassungsbooks is a platform to create (scientific) Books, Articles or whole Journals and exporting them as PDF, HTML or EPub.

The current alpha version is used at the [Verfassungsblog](https://verfassungsblog.de) to create our [Books](https://verfassungsblog.de/books) and [Journal "Verfassungsblatt"](https://verfassungsblog.de/blatt).


Master Branch:
[![Master Branch](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/master.svg)](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/master?) Staging Branch: [![Staging Branch](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/staging.svg)](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/staging?)

## Contact
Developer: [kd@verfassungsblog.de](mailto:kd@verfassungsblog.de)

General inquires and feedback: [oa@verfassungsblog.de](mailto:oa@verfassungsblog.de)

## Architecture
You will need the main server (this repository) at least one instance of the
[rendering server](https://github.com/Verfassungsblog/Verfassungsbooks-Rendering-Server).
For the main server you should use an nginx proxy to avoid running this application as root.

## Installation
You can either build the project from source or use the prebuilt binaries.
### Building from Source
0. Make sure that you have rustc, cargo and npm installed & in your path
1. Clone this repository
2. Install handlebars && tsc : ``npm install -g handlebars typescript``
3. cd into typescript & run: ``cd typescript && npm install``
4. Build with cargo: ``cd ../ && cargo build``
### Using Binary
Open the latest build from [here](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/master) and download the verfassungsbooks-bundled.tar.gz artifact.
Extract the contents.

## Configuration
### CA Setup
You will need certificates from your own CA for communication with the rendering server via mTLS.
#### Preparations
Install openssl, create a new directory for your CA and cd into it:

``apt install openssl``

``mkdir my-ca && cd my-ca``
#### Create Config
Create a new file **ca.conf** with this content:
````
[ca]
default_ca = default

[default]
dir = .
certs = $dir
new_certs_dir = $dir/db.certs

database = $dir/db.index
serial = $dir/db.serial

certificate = $dir/root.crt
private_key = $dir/root.key

default_days = 365
default_crl_days = 30

default_md = sha256

preserve = no
policy = default_policy

[default_policy]
countryName = optional
stateOrProvinceName = optional
localityName = optional
organizationName = supplied
organizationalUnitName = supplied
commonName = supplied
emailAddress = optional

[crl_ext]
authorityKeyIdentifier=keyid:always

[ usr_cert ]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
authorityKeyIdentifier = keyid,issuer
subjectKeyIdentifier = hash
subjectAltName = $ENV::SAN
````
#### Initialize Directory & files
```
mkdir -p db.certs input output
touch db.index
echo "01" > db.serial
```
#### Generate CA Private Key & Cert
```
openssl ecparam -name prime256v1 -genkey -noout -out root.key -aes256
openssl req -new -x509 -key root.key -out root.crt -days 3650 -sha256
```

**Important:** keep all private keys secure, especially the CA private key!
If leaked, anyone can connect to your main / rendering server.
#### Generate certificate revocation list & convert to right format
```
openssl ca -config ca.conf -gencrl -out crl.pem
openssl crl -in crl.pem -out crl.der -outform DER
```
#### Create and sign certificates for each server
Repeat for each server:

* Generate the private key & certificate signing request **on the server**:
```
openssl ecparam -name prime256v1 -genkey -noout -out client.key
openssl req -new -key client.key -out client.csr -sha256
```
* Transfer your .csr File to the computer with the CA certificate.
* Set the SAN & sign with CA (replace \<hostname\> with your servers hostname:
```
export SAN="DNS:<hostname>"
openssl ca -config ca.conf -in client.csr -out client.crt -days 3650 -extensions usr_cert
```
