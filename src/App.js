import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Input,
  SkeletonText,
  Text,
} from '@chakra-ui/react'
import { FaLocationArrow, FaTimes } from 'react-icons/fa'

import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  Autocomplete,
  DirectionsRenderer,
  Polyline
} from '@react-google-maps/api'
import { useRef, useState } from 'react'


const center = { lat: 48.8584, lng: 2.2945 }

function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.google_api_key,
    libraries: ['places'],
  })

  const [timeSeriesData, setTimeSeriesData] = useState([0])
  const [isPlaying, setIsPlaying] = useState(false);

  function parseCSVData(data) {
    const lines = data.split('\n').filter(line => line.trim() !== '')
    const parsedData = lines.map(line => {
      const [time, lat, lng] = line.split(',').map(item => item.trim())
      return { time, lat: parseFloat(lat), lng: parseFloat(lng) }
    })
    setTimeSeriesData(parsedData)
  }

  const [currentStep, setCurrentStep] = useState(0);

  const [map, setMap] = useState(/** @type google.maps.Map */ (null))
  const [directionsResponse, setDirectionsResponse] = useState(null)
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')

  /** @type React.MutableRefObject<HTMLInputElement> */
  const originRef = useRef()
  /** @type React.MutableRefObject<HTMLInputElement> */
  const destiantionRef = useRef()

  if (!isLoaded) {
    return <SkeletonText />
  }

  

  async function calculateRoute() {
    if (originRef.current.value === '' || destiantionRef.current.value === '') {
      return
    }
    // eslint-disable-next-line no-undef
    const directionsService = new google.maps.DirectionsService()
    const results = await directionsService.route({
      origin: originRef.current.value,
      destination: destiantionRef.current.value,
      // eslint-disable-next-line no-undef
      travelMode: google.maps.TravelMode.DRIVING,
    })
    setDirectionsResponse(results)
    setDistance(results.routes[0].legs[0].distance.text)
    setDuration(results.routes[0].legs[0].duration.text)
  }

  function clearRoute() {
    setDirectionsResponse(null)
    setDistance('')
    setDuration('')
    originRef.current.value = ''
    destiantionRef.current.value = ''
  }

  function startSimulation() {
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < timeSeriesData.length - 1) {
          return prev + 1;
        } else {
          stopSimulation(interval);
          return prev;
        }
      });
    }, 1000); // Here, 1000ms (or 1 second) is the fixed time interval for moving the drone. Adjust as needed.
  }

  function stopSimulation(interval) {
    setIsPlaying(false);
    clearInterval(interval);
  }

  return (
    <Flex
      position='relative'
      flexDirection='column'
      alignItems='center'
      h='100vh'
      w='100vw'
    >
      <Box position='absolute' left={0} top={0} h='100%' w='100%'>
        {/* Google Map Box */}
        <GoogleMap
          center={center}
          zoom={15}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          options={{
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
          onLoad={map => setMap(map)}
        >

          <Marker position={center} />
          {directionsResponse && (
            <DirectionsRenderer directions={directionsResponse} />
          )}

            {timeSeriesData.map((dataPoint, index) => (
            <Marker
              key={index}
              position={{ lat: dataPoint.lat, lng: dataPoint.lng }}
              label={dataPoint.time}
            />
          ))}
           {timeSeriesData.length > 0 && (
            <Polyline
              path={timeSeriesData.map(point => ({ lat: point.lat, lng: point.lng }))}
              options={{ strokeColor: "#FF0000" }}
            />
          )}

          {/* Marker to display the drone's current position */}
          {timeSeriesData.length > 0 && (
            <Marker
              position={{ 
                lat: timeSeriesData[currentStep].lat, 
                lng: timeSeriesData[currentStep].lng 
              }}
              label={timeSeriesData[currentStep].time}
            />
          )}
        </GoogleMap>
        
      </Box>
      <Box
        p={4}
        borderRadius='lg'
        m={4}
        bgColor='white'
        shadow='base'
        minW='container.md'
        zIndex='1'
      >
        <Box mt={2}>
      <Button 
        onClick={startSimulation}
        disabled={isPlaying || currentStep === timeSeriesData.length - 1}
      >
        Play
      </Button>
      <Button 
        onClick={() => stopSimulation()}
        disabled={!isPlaying}
      >
        Stop
      </Button>
      <Button 
        onClick={() => setCurrentStep(0)}
      >
        Reset
      </Button>
    </Box>
        <Box mt={4}>
          <textarea
            rows={5}
            placeholder="Enter time series data (format: time, lat, lng)"
            style={{ width: '100%' }}
            id="csvData"
          />
          <Button
            mt={2}
            onClick={() => parseCSVData(document.getElementById('csvData').value)}
          >
            Load Data on Map
          </Button>
        </Box>
        
        <HStack spacing={2} justifyContent='space-between'>
          <Box flexGrow={1}>
            <Autocomplete>
              <Input type='text' placeholder='Origin' ref={originRef} />
            </Autocomplete>
          </Box>
          <Box flexGrow={1}>
            <Autocomplete>
              <Input
                type='text'
                placeholder='Destination'
                ref={destiantionRef}
              />
            </Autocomplete>
          </Box>

          <ButtonGroup>
            <Button colorScheme='pink' type='submit' onClick={calculateRoute}>
              Calculate Route
            </Button>
            <IconButton
              aria-label='center back'
              icon={<FaTimes />}
              onClick={clearRoute}
            />
          </ButtonGroup>
        </HStack>
        <HStack spacing={4} mt={4} justifyContent='space-between'>
          <Text>Distance: {distance} </Text>
          <Text>Duration: {duration} </Text>
          <IconButton
            aria-label='center back'
            icon={<FaLocationArrow />}
            isRound
            onClick={() => {
              map.panTo(center)
              map.setZoom(15)
            }}
          />
        </HStack>
        <Button 
          mt={2} 
          onClick={() => setCurrentStep((prev) => Math.min(prev + 1, timeSeriesData.length - 1))} 
          disabled={currentStep === timeSeriesData.length - 1}
        >
          Move Forward
        </Button>
        <Button 
          mt={2} 
          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))} 
          disabled={currentStep === 0}
        >
          Move Backward
        </Button>
      </Box>
      
      
    </Flex>
  )
}

export default App