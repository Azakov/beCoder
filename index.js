const args = process.argv;
const imagemagick = require('imagemagick');
const fetch = require('node-fetch');

const main = () => {
    const imgaePath = args[args.length - 1];
    imagemagick.readMetadata(imgaePath, (error, info) => {
        if (error) {
            showImageError();
            throw error;
        }
        let normalLatitude, normalLongitude;

        switch (args[2]) {
            case '-c':
            case '--city':
                [normalLatitude, normalLongitude] = getGeoCoordinates(info);
                getCity(normalLatitude, normalLongitude);
                break;
            case '-w':
                resizeImage(args[args.length - 1], +args[3], +args[5]);
                break;
            default:
                [normalLatitude, normalLongitude] = getGeoCoordinates(info);
                console.log(`lat: ${normalLatitude}, lon: ${normalLongitude}`);
        }
    });
};

function getCity(normalLatitude, normalLongitude) {
    const url =
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/geolocate/address';
    const token = '2403ceb59be7603aea3314da02effca27f3a7ee7';
    const query = { lat: normalLatitude, lon: normalLongitude };
    const options = {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Token ' + token,
        },
        body: JSON.stringify(query),
    };

    fetch(url, options)
        .then((response) => response.json())
        .then((result) => {
            console.log(
                result.suggestions[result.suggestions.length - 1].data.city
            );
        })
        .catch((error) => console.log('error', error));
}

function resizeImage(path, width, height) {
    if (!path || isNaN(height) || isNaN(width)) {
        showCommandError();
    }
    const distPath = path.replace(/(.*\/)(.*)(\..*$)/, '$1$2_resized$3');

    imagemagick.resize(
        {
            srcPath: path,
            dstPath: distPath,
            width: width,
            height: height,
        },
        (error, _) => {
            if (error) {
                showResizeError();
                throw error;
            }
            imagemagick.identify(distPath, (error, info) => {
                if (error) {
                    showResizeError();
                    throw error;
                }
                console.log(info.filesize.replace(/[^0-9]/gi, ''));
            });
        }
    );
}

function getGeoCoordinates(info) {
    if (!info || !info.exif) {
        showImageError();
        return [];
    }

    const gpsLatitude = info.exif.gpsLatitude.split(',');
    const gpsLatitudeRef = info.exif.gpsLatitudeRef;
    const gpsLongitude = info.exif.gpsLongitude.split(',');
    const gpsLongitudeRef = info.exif.gpsLongitudeRef;

    const normalLatitude = getNormalCoordinates(
        gpsLatitude,
        gpsLatitudeRef === 'S' ? -1 : 1
    );
    const normalLongitude = getNormalCoordinates(
        gpsLongitude,
        gpsLongitudeRef === 'W' ? -1 : 1
    );

    return [normalLatitude, normalLongitude];
}

function getNormalCoordinates(gpsCoords, isPostive) {
    let num, den;
    [num, den] = gpsCoords[0].split('/');
    const degrees = num / den;
    [num, den] = gpsCoords[1].split('/');
    const minutes = num / den;
    [num, den] = gpsCoords[2].split('/');
    const seconds = num / den;

    return isPostive * (degrees + minutes / 60 + seconds / 3600).toFixed(3);
}

showCommandError = () => console.log('Ошибка в написании команды!');
showImageError = () =>
    console.log('Ошибка при выборе изображения, попробуйте другое');
showResizeError = () =>
    console.log('Ошибка при изменении размеров изображения!');

main();
